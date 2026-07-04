//+------------------------------------------------------------------+
//|                                                   SyncTrades.mq5 |
//|                                      TradeMind MT5 Sync Script   |
//|                                          https://trademind.app   |
//+------------------------------------------------------------------+
#property copyright "TradeMind"
#property link      "https://trademind.app"
#property version   "2.00"
#property script_show_inputs

// --- Script Parameters ---
input int      InpDaysToSync = 30;                                           // Days of history to sync
input string   InpServerUrl  = "http://localhost:3000/api/sync-trades";      // TradeMind API URL
input string   InpApiKey     = "";                                           // API Key (from Settings page)

//+------------------------------------------------------------------+
//| Script program start function                                    |
//+------------------------------------------------------------------+
void OnStart()
{
   Print("TradeMind MT5 Sync v2.0 — Starting...");
   
   // Select history range
   datetime fromDate = TimeCurrent() - InpDaysToSync * 24 * 3600;
   datetime toDate   = TimeCurrent();
   
   if(!HistorySelect(fromDate, toDate))
   {
      Alert("Failed to select deal history from MT5 terminal database.");
      return;
   }
   
   int totalDeals = HistoryDealsTotal();
   Print("Total deals in selected period: ", totalDeals);
   
   string jsonPayload = "{\"apiKey\":\"" + InpApiKey + "\",\"trades\":[";
   int exportCount = 0;
   
   for(int i = 0; i < totalDeals; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket <= 0) continue;
      
      // Only sync closing deals (DEAL_ENTRY_OUT or DEAL_ENTRY_INOUT)
      long entryType = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      if(entryType != DEAL_ENTRY_OUT && entryType != DEAL_ENTRY_INOUT) continue;
      
      // --- EXIT deal properties ---
      double profit      = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      double commission  = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
      double swap        = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
      double exitPrice   = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      double volume      = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      datetime exitTime  = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
      string symbol      = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      long positionId    = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      
      // --- Find matching ENTRY deal ---
      double entryPrice  = 0;
      datetime entryTime = 0;
      string direction   = "Buy";
      
      // Search backwards for the original entry deal
      ulong entryTicket = 0;
      for(int j = i - 1; j >= 0; j--)
      {
         ulong t = HistoryDealGetTicket(j);
         if(HistoryDealGetInteger(t, DEAL_POSITION_ID) == positionId && 
            HistoryDealGetInteger(t, DEAL_ENTRY) == DEAL_ENTRY_IN)
         {
            entryTicket = t;
            break;
         }
      }
      
      // If not found in current range, search all history
      if(entryTicket == 0)
      {
         if(HistorySelect(0, TimeCurrent()))
         {
            for(int j = 0; j < HistoryDealsTotal(); j++)
            {
               ulong t = HistoryDealGetTicket(j);
               if(HistoryDealGetInteger(t, DEAL_POSITION_ID) == positionId && 
                  HistoryDealGetInteger(t, DEAL_ENTRY) == DEAL_ENTRY_IN)
               {
                  entryTicket = t;
                  break;
               }
            }
            // Restore range
            HistorySelect(fromDate, toDate);
         }
      }
      
      if(entryTicket > 0)
      {
         entryPrice = HistoryDealGetDouble(entryTicket, DEAL_PRICE);
         entryTime  = (datetime)HistoryDealGetInteger(entryTicket, DEAL_TIME);
         long dealType = HistoryDealGetInteger(entryTicket, DEAL_TYPE);
         direction = (dealType == DEAL_TYPE_BUY) ? "Buy" : "Sell";
      }
      else
      {
         entryPrice = exitPrice;
         entryTime  = exitTime;
      }
      
      // --- Get symbol precision ---
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      if(digits <= 0) digits = 5;
      
      // --- Format entry datetime ---
      MqlDateTime entryDt;
      TimeToStruct(entryTime, entryDt);
      string entryDateStr = StringFormat("%04d-%02d-%02d", entryDt.year, entryDt.mon, entryDt.day);
      string entryTimeStr = StringFormat("%02d:%02d", entryDt.hour, entryDt.min);
      
      // --- Format exit datetime ---
      MqlDateTime exitDt;
      TimeToStruct(exitTime, exitDt);
      string exitDateStr = StringFormat("%04d-%02d-%02d", exitDt.year, exitDt.mon, exitDt.day);
      string exitTimeStr = StringFormat("%02d:%02d", exitDt.hour, exitDt.min);
      
      // --- Construct JSON object for this trade ---
      if(exportCount > 0) jsonPayload += ",";
      
      jsonPayload += "{";
      jsonPayload += "\"ticket\":" + IntegerToString((long)dealTicket) + ",";
      jsonPayload += "\"positionId\":" + IntegerToString(positionId) + ",";
      jsonPayload += "\"symbol\":\"" + symbol + "\",";
      jsonPayload += "\"direction\":\"" + direction + "\",";
      jsonPayload += "\"lotSize\":" + DoubleToString(volume, 2) + ",";
      jsonPayload += "\"entryPrice\":" + DoubleToString(entryPrice, digits) + ",";
      jsonPayload += "\"exitPrice\":" + DoubleToString(exitPrice, digits) + ",";
      jsonPayload += "\"entryDate\":\"" + entryDateStr + "\",";
      jsonPayload += "\"entryTime\":\"" + entryTimeStr + "\",";
      jsonPayload += "\"exitDate\":\"" + exitDateStr + "\",";
      jsonPayload += "\"exitTime\":\"" + exitTimeStr + "\",";
      jsonPayload += "\"pnl\":" + DoubleToString(profit, 2) + ",";
      jsonPayload += "\"commission\":" + DoubleToString(MathAbs(commission), 2) + ",";
      jsonPayload += "\"swap\":" + DoubleToString(MathAbs(swap), 2);
      jsonPayload += "}";
      
      exportCount++;
   }
   
   jsonPayload += "]}";
   
   if(exportCount == 0)
   {
      Print("No closed positions found in the last ", InpDaysToSync, " days.");
      Alert("No closed trades to sync.");
      return;
   }
   
   Print("Syncing ", exportCount, " closed trades to TradeMind...");
   
   // --- Send HTTP POST request ---
   char postData[];
   StringToCharArray(jsonPayload, postData, 0, WHOLE_ARRAY, CP_UTF8);
   
   string headers = "Content-Type: application/json\r\n";
   char resultData[];
   string resultHeaders;
   
   ResetLastError();
   int responseCode = WebRequest("POST", InpServerUrl, headers, 5000, postData, resultData, resultHeaders);
   
   if(responseCode == -1)
   {
      int errorCode = GetLastError();
      Print("WebRequest error code: ", errorCode);
      
      if(errorCode == 4014)
      {
         Alert("WebRequests blocked! Enable in MT5:\n" +
               "Tools → Options → Expert Advisors → Allow WebRequest\n" +
               "Add URL: http://localhost:3000");
      }
      else
      {
         Alert("Connection failed to " + InpServerUrl + ". Error: " + IntegerToString(errorCode) +
               "\nMake sure your TradeMind dev server is running (npm run dev).");
      }
   }
   else if(responseCode == 200)
   {
      string response = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
      Print("Sync successful! Server response: ", response);
      Alert("✓ Successfully synced " + IntegerToString(exportCount) + " trades to TradeMind!");
   }
   else
   {
      string response = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
      Print("Server error (HTTP ", responseCode, "): ", response);
      Alert("Server Error (HTTP " + IntegerToString(responseCode) + "): " + response);
   }
}
//+------------------------------------------------------------------+
