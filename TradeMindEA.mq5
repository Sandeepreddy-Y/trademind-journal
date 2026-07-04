//+------------------------------------------------------------------+
//|                                                  TradeMindEA.mq5 |
//|                                   TradeMind Real-time Sync EA    |
//|                                          https://trademind.app   |
//+------------------------------------------------------------------+
#property copyright "TradeMind"
#property link      "https://trademind.app"
#property version   "1.00"
#property description "Expert Advisor to sync closed trades to TradeMind in real-time."

// --- EA Parameters ---
input string   InpServerUrl      = "http://localhost:3000/api/mt5/trades";   // TradeMind EA API URL
input string   InpApiKey         = "";                                       // Your Bearer API Key (User ID)
input long     InpMagicFilter    = 0;                                        // Magic Number Filter (0 = Sync All)
input int      InpRetrySeconds   = 30;                                       // Retry Interval (seconds)

// --- File Storage Names ---
#define SENT_TICKETS_FILE "trademind_sent_tickets.txt"
#define RETRY_QUEUE_FILE  "trademind_retry_queue.txt"

// --- Global Variables ---
ulong  g_SentTickets[];     // In-memory cache of successfully sent tickets
ulong  g_RetryTickets[];    // Tickets currently waiting to be sent
datetime g_LastHistoryScan;  // Last time we scanned history

//+------------------------------------------------------------------+
//| EA Initialization                                                |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("TradeMind Real-time Sync EA starting...");
   
   if(StringLen(InpApiKey) == 0)
   {
      Alert("WARNING: InpApiKey is empty! Please set your API Key in inputs.");
      return(INIT_PARAMETERS_INCORRECT);
   }

   // Load sent cache and retry queue from file
   LoadSentTickets();
   LoadRetryQueue();
   
   // Set timer for retry loop
   EventSetTimer(InpRetrySeconds);
   
   // Perform initial catch-up scan for the last 3 days
   g_LastHistoryScan = TimeCurrent() - 3 * 24 * 3600;
   ScanHistoryForUnsynced(g_LastHistoryScan);
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| EA Deinitialization                                              |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   SaveRetryQueue();
   Print("TradeMind EA stopped. Reason code: ", reason);
}

//+------------------------------------------------------------------+
//| OnTradeTransaction Event (Real-time Detection)                   |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   // We are looking for deals added to history
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ulong dealTicket = trans.deal;
      if(dealTicket <= 0) return;
      
      // Select the deal
      if(HistoryDealSelect(dealTicket))
      {
         long entryType = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
         
         // Only sync closing deals (DEAL_ENTRY_OUT or DEAL_ENTRY_INOUT)
         if(entryType == DEAL_ENTRY_OUT || entryType == DEAL_ENTRY_INOUT)
         {
            long magic = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
            if(InpMagicFilter == 0 || magic == InpMagicFilter)
            {
               // Process and sync
               ProcessAndSyncDeal(dealTicket);
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| OnTimer Event (Retry Mechanism)                                  |
//+------------------------------------------------------------------+
void OnTimer()
{
   int queueSize = ArraySize(g_RetryTickets);
   if(queueSize > 0)
   {
      Print("[TradeMind] Retrying ", queueSize, " failed trade syncs...");
      
      // Copy queue to temp array to process
      ulong tempQueue[];
      ArrayCopy(tempQueue, g_RetryTickets);
      ArrayFree(g_RetryTickets);
      
      for(int i = 0; i < ArraySize(tempQueue); i++)
      {
         ulong ticket = tempQueue[i];
         if(!SyncDealToBackend(ticket))
         {
            // Re-add to retry queue if still failing
            AddToRetryQueue(ticket);
         }
      }
      
      // Save updated queue to file
      SaveRetryQueue();
   }
}

//+------------------------------------------------------------------+
//| Process and Sync a single deal                                   |
//+------------------------------------------------------------------+
void ProcessAndSyncDeal(ulong dealTicket)
{
   // Check if already in sent list
   if(IsTicketSent(dealTicket))
   {
      return;
   }
   
   Print("[TradeMind] New closed trade detected. Ticket #", dealTicket);
   
   if(!SyncDealToBackend(dealTicket))
   {
      Print("[TradeMind] Initial sync failed for Ticket #", dealTicket, ". Queued for retry.");
      AddToRetryQueue(dealTicket);
      SaveRetryQueue();
   }
}

//+------------------------------------------------------------------+
//| Sync Deal to Backend API via HTTP POST                           |
//+------------------------------------------------------------------+
bool SyncDealToBackend(ulong dealTicket)
{
   if(!HistoryDealSelect(dealTicket))
   {
      Print("[TradeMind] Error: Could not select deal #", dealTicket);
      return false;
   }
   
   // --- Extract exit deal properties ---
   double profit      = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
   double commission  = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
   double swap        = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
   double exitPrice   = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   double volume      = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
   datetime exitTime  = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
   string symbol      = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   long positionId    = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   long magic         = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
   string comment     = HistoryDealGetString(dealTicket, DEAL_COMMENT);
   
   // --- Find matching entry deal to compute Entry Price and Open Time ---
   double entryPrice  = 0;
   datetime entryTime = 0;
   string direction   = "Buy";
   
   if(HistorySelect(0, TimeCurrent()))
   {
      for(int i = 0; i < HistoryDealsTotal(); i++)
      {
         ulong t = HistoryDealGetTicket(i);
         if(HistoryDealGetInteger(t, DEAL_POSITION_ID) == positionId && 
            HistoryDealGetInteger(t, DEAL_ENTRY) == DEAL_ENTRY_IN)
         {
            entryPrice = HistoryDealGetDouble(t, DEAL_PRICE);
            entryTime  = (datetime)HistoryDealGetInteger(t, DEAL_TIME);
            long dealType = HistoryDealGetInteger(t, DEAL_TYPE);
            direction = (dealType == DEAL_TYPE_BUY) ? "Buy" : "Sell";
            break;
         }
      }
   }
   
   if(entryPrice == 0)
   {
      entryPrice = exitPrice;
      entryTime  = exitTime;
   }
   
   // --- Extract system info ---
   long login          = AccountInfoInteger(ACCOUNT_LOGIN);
   string company      = AccountInfoString(ACCOUNT_COMPANY);
   string server       = AccountInfoString(ACCOUNT_SERVER);
   double stopLoss     = HistoryDealGetDouble(dealTicket, DEAL_SL);
   double takeProfit   = HistoryDealGetDouble(dealTicket, DEAL_TP);
   
   long durationSeconds = (long)(exitTime - entryTime);
   
   // --- Get precision ---
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   if(digits <= 0) digits = 5;
   
   // --- Format datetime strings ---
   string openTimeStr = TimeToString(entryTime, TIME_DATE|TIME_MINUTES|TIME_SECONDS);
   string closeTimeStr = TimeToString(exitTime, TIME_DATE|TIME_MINUTES|TIME_SECONDS);
   
   // --- Construct JSON payload ---
   string json = "{";
   json += "\"accountNumber\":" + IntegerToString(login) + ",";
   json += "\"brokerName\":\"" + company + "\",";
   json += "\"serverName\":\"" + server + "\",";
   json += "\"ticket\":" + IntegerToString((long)dealTicket) + ",";
   json += "\"positionId\":" + IntegerToString(positionId) + ",";
   json += "\"symbol\":\"" + symbol + "\",";
   json += "\"direction\":\"" + direction + "\",";
   json += "\"lotSize\":" + DoubleToString(volume, 2) + ",";
   json += "\"entryPrice\":" + DoubleToString(entryPrice, digits) + ",";
   json += "\"exitPrice\":" + DoubleToString(exitPrice, digits) + ",";
   json += "\"stopLoss\":" + DoubleToString(stopLoss, digits) + ",";
   json += "\"takeProfit\":" + DoubleToString(takeProfit, digits) + ",";
   json += "\"pnl\":" + DoubleToString(profit, 2) + ",";
   json += "\"commission\":" + DoubleToString(commission, 2) + ",";
   json += "\"swap\":" + DoubleToString(swap, 2) + ",";
   json += "\"openTime\":\"" + openTimeStr + "\",";
   json += "\"closeTime\":\"" + closeTimeStr + "\",";
   json += "\"durationSeconds\":" + IntegerToString(durationSeconds) + ",";
   json += "\"magicNumber\":" + IntegerToString(magic) + ",";
   json += "\"comment\":\"" + SanitizeJsonString(comment) + "\"";
   json += "}";
   
   // --- Send HTTP POST request ---
   char postData[];
   StringToCharArray(json, postData, 0, WHOLE_ARRAY, CP_UTF8);
   
   string headers = "Content-Type: application/json\r\n";
   headers += "Authorization: Bearer " + InpApiKey + "\r\n";
   
   char resultData[];
   string resultHeaders;
   
   ResetLastError();
   int responseCode = WebRequest("POST", InpServerUrl, headers, 5000, postData, resultData, resultHeaders);
   
   if(responseCode == 200 || responseCode == 201)
   {
      Print("[TradeMind] Sync successful for Ticket #", dealTicket);
      AddToSentCache(dealTicket);
      SaveSentTickets();
      return true;
   }
   else
   {
      int errCode = GetLastError();
      string servMsg = (ArraySize(resultData) > 0) ? CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8) : "";
      Print("[TradeMind] Sync failed for Ticket #", dealTicket, ". HTTP Code: ", responseCode, ". Error: ", errCode, ". Response: ", servMsg);
      return false;
   }
}

//+------------------------------------------------------------------+
//| Scan past history for unsynced deals                             |
//+------------------------------------------------------------------+
void ScanHistoryForUnsynced(datetime startTime)
{
   if(!HistorySelect(startTime, TimeCurrent())) return;
   
   int count = HistoryDealsTotal();
   int unsyncedCount = 0;
   
   for(int i = 0; i < count; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket <= 0) continue;
      
      long entryType = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entryType == DEAL_ENTRY_OUT || entryType == DEAL_ENTRY_INOUT)
      {
         long magic = HistoryDealGetInteger(ticket, DEAL_MAGIC);
         if(InpMagicFilter == 0 || magic == InpMagicFilter)
         {
            if(!IsTicketSent(ticket))
            {
               AddToRetryQueue(ticket);
               unsyncedCount++;
            }
         }
      }
   }
   
   if(unsyncedCount > 0)
   {
      Print("[TradeMind] Startup scan found ", unsyncedCount, " unsynced trades. Added to queue.");
      SaveRetryQueue();
   }
}

//+------------------------------------------------------------------+
//| Helper: Check if a ticket has already been sent                  |
//+------------------------------------------------------------------+
bool IsTicketSent(ulong ticket)
{
   for(int i = 0; i < ArraySize(g_SentTickets); i++)
   {
      if(g_SentTickets[i] == ticket) return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Helper: Add a ticket to sent cache                               |
//+------------------------------------------------------------------+
void AddToSentCache(ulong ticket)
{
   if(IsTicketSent(ticket)) return;
   int size = ArraySize(g_SentTickets);
   ArrayResize(g_SentTickets, size + 1);
   g_SentTickets[size] = ticket;
}

//+------------------------------------------------------------------+
//| Helper: Add ticket to retry queue                                 |
//+------------------------------------------------------------------+
void AddToRetryQueue(ulong ticket)
{
   // Check if already in retry queue
   for(int i = 0; i < ArraySize(g_RetryTickets); i++)
   {
      if(g_RetryTickets[i] == ticket) return;
   }
   // Don't retry if already successfully sent
   if(IsTicketSent(ticket)) return;
   
   int size = ArraySize(g_RetryTickets);
   ArrayResize(g_RetryTickets, size + 1);
   g_RetryTickets[size] = ticket;
}

//+------------------------------------------------------------------+
//| File I/O: Load Sent Cache from disk                              |
//+------------------------------------------------------------------+
void LoadSentTickets()
{
   ArrayFree(g_SentTickets);
   int fileHandle = FileOpen(SENT_TICKETS_FILE, FILE_READ|FILE_TXT);
   if(fileHandle != INVALID_HANDLE)
   {
      while(!FileIsEnding(fileHandle))
      {
         string line = FileReadString(fileHandle);
         ulong ticket = StringToInteger(line);
         if(ticket > 0)
         {
            AddToSentCache(ticket);
         }
      }
      FileClose(fileHandle);
      Print("[TradeMind] Loaded ", ArraySize(g_SentTickets), " whitelisted sent tickets from disk cache.");
   }
}

//+------------------------------------------------------------------+
//| File I/O: Save Sent Cache to disk                                |
//+------------------------------------------------------------------+
void SaveSentTickets()
{
   int fileHandle = FileOpen(SENT_TICKETS_FILE, FILE_WRITE|FILE_TXT);
   if(fileHandle != INVALID_HANDLE)
   {
      for(int i = 0; i < ArraySize(g_SentTickets); i++)
      {
         FileWriteString(fileHandle, IntegerToString(g_SentTickets[i]) + "\n");
      }
      FileClose(fileHandle);
   }
}

//+------------------------------------------------------------------+
//| File I/O: Load Retry Queue from disk                             |
//+------------------------------------------------------------------+
void LoadRetryQueue()
{
   ArrayFree(g_RetryTickets);
   int fileHandle = FileOpen(RETRY_QUEUE_FILE, FILE_READ|FILE_TXT);
   if(fileHandle != INVALID_HANDLE)
   {
      while(!FileIsEnding(fileHandle))
      {
         string line = FileReadString(fileHandle);
         ulong ticket = StringToInteger(line);
         if(ticket > 0)
         {
            AddToRetryQueue(ticket);
         }
      }
      FileClose(fileHandle);
      Print("[TradeMind] Loaded ", ArraySize(g_RetryTickets), " retry items from persistent disk queue.");
   }
}

//+------------------------------------------------------------------+
//| File I/O: Save Retry Queue to disk                               |
//+------------------------------------------------------------------+
void SaveRetryQueue()
{
   int fileHandle = FileOpen(RETRY_QUEUE_FILE, FILE_WRITE|FILE_TXT);
   if(fileHandle != INVALID_HANDLE)
   {
      for(int i = 0; i < ArraySize(g_RetryTickets); i++)
      {
         FileWriteString(fileHandle, IntegerToString(g_RetryTickets[i]) + "\n");
      }
      FileClose(fileHandle);
   }
}

//+------------------------------------------------------------------+
//| helper: Escape quotes in comment for JSON compatibility         |
//+------------------------------------------------------------------+
string SanitizeJsonString(string text)
{
   string out = text;
   StringReplace(out, "\\", "\\\\");
   StringReplace(out, "\"", "\\\"");
   StringReplace(out, "\r", "");
   StringReplace(out, "\n", " ");
   StringReplace(out, "\t", " ");
   return out;
}
//+------------------------------------------------------------------+
