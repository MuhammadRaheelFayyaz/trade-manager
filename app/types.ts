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