/**
 * MT5 HTML Trade History Report Parser
 * 
 * Parses MetaTrader 5 HTML reports exported via:
 *   Reports > Account History > Save as Detailed Report (HTML)
 * 
 * Extracts the "Positions" table and ignores account summary data.
 * Handles various MT5 report formats and edge cases.
 */

import * as cheerio from 'cheerio';
import logger from '@/lib/logger';

// ============================================
// Types
// ============================================
export interface ParsedMT5Trade {
  ticket: number;
  symbol: string;
  direction: 'Buy' | 'Sell';
  volume: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  openTime: Date;
  closeTime: Date;
  profit: number;
  commission: number;
  swap: number;
}

export interface MT5ParseResult {
  success: boolean;
  trades: ParsedMT5Trade[];
  errors: string[];
  totalFound: number;
  totalParsed: number;
}

// ============================================
// Session Detection
// ============================================
export function detectTradingSession(date: Date): 'Asian' | 'London' | 'New York' | 'Overlap' {
  const hours = date.getUTCHours();

  // Overlap: 13:00 - 16:00 UTC (London and NY overlap)
  if (hours >= 13 && hours < 16) {
    return 'Overlap';
  }
  // London: 08:00 - 13:00 UTC
  if (hours >= 8 && hours < 13) {
    return 'London';
  }
  // New York: 16:00 - 21:00 UTC (after overlap)
  if (hours >= 16 && hours < 21) {
    return 'New York';
  }
  // Asian: 21:00 - 08:00 UTC
  return 'Asian';
}

// ============================================
// Holding Time Calculation
// ============================================
export function calculateHoldingTimeMinutes(openTime: Date, closeTime: Date): number {
  const diffMs = closeTime.getTime() - openTime.getTime();
  if (diffMs < 0) return 0;
  return Math.round(diffMs / 60000);
}

// ============================================
// Week Number Calculation (ISO 8601)
// ============================================
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ============================================
// Day/Month Names
// ============================================
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ============================================
// Risk Reward Calculation
// ============================================
export function calculateRiskReward(
  direction: 'Buy' | 'Sell',
  entryPrice: number,
  stopLoss: number,
  takeProfit: number
): number | null {
  if (stopLoss <= 0 || takeProfit <= 0) return null;

  let risk: number;
  let reward: number;

  if (direction === 'Buy') {
    risk = Math.abs(entryPrice - stopLoss);
    reward = Math.abs(takeProfit - entryPrice);
  } else {
    risk = Math.abs(stopLoss - entryPrice);
    reward = Math.abs(entryPrice - takeProfit);
  }

  if (risk === 0) return null;
  return Number((reward / risk).toFixed(2));
}

// ============================================
// Computed Trade Fields
// ============================================
export function computeTradeFields(trade: ParsedMT5Trade) {
  const openDate = new Date(trade.openTime);
  const closeDate = new Date(trade.closeTime);

  return {
    holdingTime: calculateHoldingTimeMinutes(openDate, closeDate),
    session: detectTradingSession(openDate),
    day: DAY_NAMES[openDate.getDay()] || 'Monday',
    week: getISOWeekNumber(openDate),
    month: MONTH_NAMES[openDate.getMonth()] || 'January',
    year: openDate.getFullYear(),
    status: trade.profit > 0 ? 'Win' : trade.profit < 0 ? 'Loss' : 'Break Even',
    riskReward: calculateRiskReward(trade.direction, trade.entryPrice, trade.stopLoss, trade.takeProfit),
  };
}

// ============================================
// Date Parsing Helpers
// ============================================

/**
 * Parse MT5 date string. MT5 uses formats like:
 *   "2024.01.15 14:30:00"
 *   "2024.01.15 14:30"
 *   "2024-01-15 14:30:00"
 *   "2024/01/15 14:30:00"
 */
function parseMT5DateTime(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;

  const cleaned = dateStr.trim();

  // Try standard Date parse first
  const standardParsed = new Date(cleaned);
  if (!isNaN(standardParsed.getTime())) return standardParsed;

  // Handle MT5 format: 2024.01.15 14:30:00
  const dotFormat = cleaned.replace(/\./g, '-');
  const dotParsed = new Date(dotFormat);
  if (!isNaN(dotParsed.getTime())) return dotParsed;

  // Handle: 2024.01.15 14:30:00 (manual parse)
  const match = cleaned.match(
    /(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/
  );
  if (match) {
    const [, yr, mo, dy, hr, mn, sc] = match;
    return new Date(
      parseInt(yr),
      parseInt(mo) - 1,
      parseInt(dy),
      parseInt(hr),
      parseInt(mn),
      sc ? parseInt(sc) : 0
    );
  }

  return null;
}

/**
 * Parse a numeric value from MT5 table cell text.
 * Handles spaces, commas, and currency symbols.
 */
function parseNumericValue(text: string): number {
  if (!text || text.trim() === '') return 0;
  const cleaned = text.replace(/[^\d.\-]/g, '');
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

// ============================================
// MT5 HTML Parser
// ============================================

/**
 * Validates that the HTML content is a valid MT5 report.
 */
export function validateMT5HTML(html: string): { valid: boolean; error?: string } {
  if (!html || html.trim().length === 0) {
    return { valid: false, error: 'Empty HTML content' };
  }

  if (html.length > 10 * 1024 * 1024) {
    return { valid: false, error: 'File too large (max 10MB)' };
  }

  // Check for MetaTrader indicators
  const lowerHtml = html.toLowerCase();
  const hasMetaTrader =
    lowerHtml.includes('metatrader') ||
    lowerHtml.includes('metaquotes') ||
    lowerHtml.includes('positions') ||
    lowerHtml.includes('trade history') ||
    lowerHtml.includes('trading history') ||
    lowerHtml.includes('account:') ||
    lowerHtml.includes('detailed trading history');

  if (!hasMetaTrader) {
    return {
      valid: false,
      error: 'This does not appear to be a valid MetaTrader 5 report. Please export your trade history from MT5 as an HTML report.',
    };
  }

  return { valid: true };
}

/**
 * Main parser: Extract trades from an MT5 HTML report.
 * 
 * MT5 reports typically have multiple tables:
 *   - Account Information
 *   - Positions (this is what we want)
 *   - Orders
 *   - Deals
 *   - Account Summary
 * 
 * We look for the "Positions" table by header content.
 */
export function parseMT5HTML(html: string): MT5ParseResult {
  const result: MT5ParseResult = {
    success: false,
    trades: [],
    errors: [],
    totalFound: 0,
    totalParsed: 0,
  };

  // Validate first
  const validation = validateMT5HTML(html);
  if (!validation.valid) {
    result.errors.push(validation.error!);
    return result;
  }

  try {
    const $ = cheerio.load(html);
    
    // Strategy 1: Find the "Positions" table by looking for a header/title
    let positionsTable: cheerio.Cheerio<any> | null = null;
    let headerRow: cheerio.Cheerio<any> | null = null;

    // Look for tables that contain position/trade data
    $('table').each((_, table) => {
      const tableHtml = $(table).html()?.toLowerCase() || '';
      
      // Check for "Positions" section header
      if (
        tableHtml.includes('position') ||
        tableHtml.includes('ticket') ||
        tableHtml.includes('symbol')
      ) {
        // Find the header row within this table
        $(table).find('tr').each((_, row) => {
          const rowText = $(row).text().toLowerCase();
          // A valid positions header should contain most of these
          const hasTicket = rowText.includes('ticket') || rowText.includes('position');
          const hasSymbol = rowText.includes('symbol');
          const hasVolume = rowText.includes('volume') || rowText.includes('lot');
          const hasPrice = rowText.includes('price');
          
          if (hasTicket && hasSymbol && (hasVolume || hasPrice)) {
            positionsTable = $(table);
            headerRow = $(row);
            return false; // break
          }
        });

        if (positionsTable) return false; // break outer loop
      }
    });

    // Strategy 2: If no explicit positions table found, search all tables more broadly
    if (!positionsTable) {
      $('table').each((_, table) => {
        $(table).find('tr').each((_, row) => {
          const cells = $(row).find('td, th');
          if (cells.length >= 6) {
            const rowText = $(row).text().toLowerCase();
            if (
              (rowText.includes('ticket') || rowText.includes('position')) &&
              rowText.includes('symbol')
            ) {
              positionsTable = $(table);
              headerRow = $(row);
              return false;
            }
          }
        });
        if (positionsTable) return false;
      });
    }

    if (!positionsTable || !headerRow) {
      result.errors.push(
        'Could not find the Positions table in the MT5 report. Make sure you exported a Detailed Report from MetaTrader 5.'
      );
      return result;
    }

    // Parse header to find column indices
    const headers: string[] = [];
    $(headerRow).find('td, th').each((_, cell) => {
      headers.push($(cell).text().trim().toLowerCase());
    });

    logger.debug('MT5 Parser: Found headers', 'MT5Parser', headers);

    // Build column index map
    const colMap: Record<string, number> = {};
    const columnMappings: Record<string, string[]> = {
      ticket: ['ticket', 'position', 'position id', '#'],
      symbol: ['symbol', 'instrument', 'pair'],
      type: ['type', 'direction', 'buy/sell', 'side'],
      volume: ['volume', 'lot', 'lots', 'size'],
      entryPrice: ['price', 'open price', 'entry price', 'entry'],
      exitPrice: ['close price', 'exit price', 'price close', 'exit'],
      stopLoss: ['s/l', 'sl', 'stop loss', 'stoploss', 's / l'],
      takeProfit: ['t/p', 'tp', 'take profit', 'takeprofit', 't / p'],
      openTime: ['time', 'open time', 'open date', 'entry time', 'open'],
      closeTime: ['close time', 'close date', 'exit time', 'close'],
      profit: ['profit', 'p/l', 'pnl', 'result', 'net profit'],
      commission: ['commission', 'comm', 'fee'],
      swap: ['swap', 'rollover'],
    };

    // Map each field to its column index
    for (const [field, aliases] of Object.entries(columnMappings)) {
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (aliases.some((alias) => header === alias || header.includes(alias))) {
          colMap[field] = i;
          break;
        }
      }
    }

    // Resolve duplicate column names (e.g. MT5 using 'time' and 'price' for both entry and exit)
    const timeIndices = headers.map((h, idx) => (h === 'time' || h.includes('time') || h.includes('date')) ? idx : -1).filter(idx => idx !== -1);
    if (timeIndices.length >= 2 && colMap['closeTime'] === undefined) {
      colMap['openTime'] = timeIndices[0];
      colMap['closeTime'] = timeIndices[1];
    }

    const priceIndices = headers.map((h, idx) => (h === 'price' || h.includes('price')) ? idx : -1).filter(idx => idx !== -1);
    if (priceIndices.length >= 2 && colMap['exitPrice'] === undefined) {
      colMap['entryPrice'] = priceIndices[0];
      colMap['exitPrice'] = priceIndices[1];
    }

    logger.debug('MT5 Parser: Column mapping', 'MT5Parser', colMap);

    // Verify we have minimum required columns
    if (colMap.ticket === undefined && colMap.symbol === undefined) {
      result.errors.push('Could not identify required columns (ticket/symbol) in the Positions table.');
      return result;
    }

    // Parse data rows (skip the header row)
    const allRows = $(positionsTable).find('tr');
    const headerIndex = allRows.index(headerRow as any);

    for (let i = headerIndex + 1; i < allRows.length; i++) {
      const row = allRows.eq(i);
      const cells = row.find('td');

      // Skip rows with insufficient cells or summary rows
      if (cells.length < 5) continue;

      const rowText = row.text().toLowerCase();
      // Skip summary/total rows
      if (
        rowText.includes('total') ||
        rowText.includes('summary') ||
        rowText.includes('balance') ||
        rowText.includes('deposit') ||
        rowText.includes('withdrawal')
      ) {
        continue;
      }

      try {
        const getCellText = (field: string): string => {
          const idx = colMap[field];
          if (idx === undefined || idx >= cells.length) return '';
          return cells.eq(idx).text().trim();
        };

        const ticketText = getCellText('ticket');
        const ticket = parseInt(ticketText);
        if (isNaN(ticket) || ticket <= 0) continue; // Skip non-trade rows

        const symbol = getCellText('symbol').toUpperCase().replace(/[^A-Z0-9.]/g, '');
        if (!symbol) continue;

        // Parse direction
        const typeText = getCellText('type').toLowerCase();
        let direction: 'Buy' | 'Sell';
        if (typeText.includes('buy') || typeText.includes('long')) {
          direction = 'Buy';
        } else if (typeText.includes('sell') || typeText.includes('short')) {
          direction = 'Sell';
        } else {
          continue; // Skip unknown direction rows (could be balance operations)
        }

        const volume = parseNumericValue(getCellText('volume'));
        const entryPrice = parseNumericValue(getCellText('entryPrice'));
        const exitPrice = parseNumericValue(getCellText('exitPrice'));
        const stopLoss = parseNumericValue(getCellText('stopLoss'));
        const takeProfit = parseNumericValue(getCellText('takeProfit'));
        const profit = parseNumericValue(getCellText('profit'));
        const commission = parseNumericValue(getCellText('commission'));
        const swap = parseNumericValue(getCellText('swap'));

        // Parse dates
        const openTime = parseMT5DateTime(getCellText('openTime'));
        const closeTime = parseMT5DateTime(getCellText('closeTime'));

        if (!openTime || !closeTime) {
          result.errors.push(`Row ${i}: Could not parse open/close time for ticket ${ticket}`);
          continue;
        }

        // Skip if exit price is 0 (open position, not completed)
        if (exitPrice <= 0) {
          logger.debug(`Skipping open position: ticket ${ticket}`, 'MT5Parser');
          continue;
        }

        result.totalFound++;

        const trade: ParsedMT5Trade = {
          ticket,
          symbol,
          direction,
          volume,
          entryPrice,
          exitPrice,
          stopLoss,
          takeProfit,
          openTime,
          closeTime,
          profit,
          commission,
          swap,
        };

        result.trades.push(trade);
        result.totalParsed++;
      } catch (rowError) {
        result.errors.push(`Row ${i}: Failed to parse - ${rowError instanceof Error ? rowError.message : 'Unknown error'}`);
      }
    }

    if (result.trades.length === 0 && result.errors.length === 0) {
      result.errors.push('No completed trades found in the Positions table.');
    }

    result.success = result.trades.length > 0;
    
    logger.info(
      `MT5 Parser: Found ${result.totalFound} positions, parsed ${result.totalParsed} trades, ${result.errors.length} errors`,
      'MT5Parser'
    );

    return result;
  } catch (error) {
    logger.error('MT5 Parser: Fatal parsing error', error, 'MT5Parser');
    result.errors.push(`Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}
