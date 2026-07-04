export interface Trade {
  id: string;
  userId: string;
  pair: string;
  direction: 'Buy' | 'Sell';
  lotSize: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice: number;
  pnl: number;
  rr: number;
  riskPct: number;
  rewardPct: number;
  commission: number;
  swap: number;
  status: 'Win' | 'Loss' | 'Break Even' | 'Open';
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  day: string;  // Monday, etc.
  week: number; // Week of the year
  month: string; // January, etc.
  year: number;
  session: 'Asian' | 'London' | 'New York' | 'Overlap';
  holdingTime: number; // in minutes
  beforeImage?: string;
  afterImage?: string;
  tvImage?: string;
  mt5Image?: string;
  notes: string;
  reason: string;
  logic: string;
  entryConfirmations: string[];
  emotion: string;
  confidence: number; // 1-10
  mistakes: string[];
  lessons: string;
  improvement: string;
  tags: string[];
  strategy: string;
  createdAt: number;
  source?: string;
  mt5Ticket?: number;
  mt5PositionId?: number;
  accountNumber?: number;
  brokerName?: string;
  serverName?: string;
}

export interface UserSettings {
  currency: string;
  timezone: string;
  defaultRiskPct: number;
  theme: 'dark' | 'light';
  weeklyTarget: number;
  monthlyTarget: number;
  riskRules: string;
  tradingChecklist: string[];
  riskLimit?: number;
  defaultLotSize?: number;
}

export interface AIAnalysisReport {
  tradeId: string;
  score: number; // out of 100
  riskManagement: string;
  psychology: string;
  mistakes: string;
  patterns: string;
  strengths: string;
  weaknesses: string;
  suggestions: string;
  generatedAt: number;
}

export interface TradingGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  type: 'weekly' | 'monthly';
  deadline: string;
  completed: boolean;
  metric?: 'pnl' | 'winRate' | 'tradeCount';
  timeframe?: 'weekly' | 'monthly';
  progress?: number;
  achieved?: boolean;
}
