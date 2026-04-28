export interface Trade {
  id: string;
  symbol: string;
  companyName: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  date: string;
  remainingQty: number;
  buyTradeId: string | null;
}

export interface MarketPrice {
  symbol: string;
  price: number;
  updatedAt: string;
}

export interface Holding {
  currentPrice: any;
  symbol: string;
  companyName: string;
  totalShares: number;
  averageCost: number;
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  lots: BuyLot[];
  originalBuyTrades?: Trade[];
}

export interface BuyLot {
  tradeId: string;
  date: string;
  quantity: number;
  remainingQty: number;
  buyPrice: number;
}

export interface SellRecord {
  id: string;
  symbol: string;
  companyName: string;
  sellDate: string;
  sellPrice: number;
  quantity: number;
  buyPrice: number;
  profit: number;
  buyTradeId: string;
}

export interface Client {
  id: string;
  name: string;
  initialInvestment: number;
  profitSharePercentage: number; // e.g., 30 for 30% of profits
  createdAt: string;
}

export interface ClientTrade extends Trade {
  clientId: string;
}

export interface ClientProfitDistribution {
  id: string;
  clientId: string;
  periodStart: string;
  periodEnd: string;
  totalProfit: number;           // profit for the period
  clientShare: number;          // profitSharePercentage * totalProfit
  paidAmount: number;           // amount actually paid out
  reinvestedAmount: number;     // amount kept in portfolio
  status: 'pending' | 'paid' | 'reinvested';
  date: string;
}



export interface Client {
  id: string;
  name: string;
  createdAt: string;
}

export interface CapitalTransaction {
  id: string;
  clientId: string;
  amount: number;        // positive = deposit (increase capital), negative = withdrawal
  date: string;
  type: 'deposit' | 'withdrawal';
  description: string;
}

export interface ProfitAllocation {
  id: string;
  clientId: string;
  periodStart: string;
  periodEnd: string;
  allocatedProfit: number;   // positive = profit, negative = loss
  clientCapitalBefore: number;
  clientCapitalAfter: number;
  totalPortfolioProfit: number;
  date: string;
}

export interface CashTransaction {
  id: string;
  amount: number;          // positive = cash inflow, negative = outflow
  date: string;
  type: 'initial_deposit' | 'buy' | 'sell' | 'withdrawal' | 'profit_reinvest' | 'profit_payout';
  description: string;
  clientId: string | null; // null for global/portfolio level
}