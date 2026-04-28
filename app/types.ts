export interface Trade {
  id: string;
  symbol: string;
  companyName: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  date: string;
  remainingqty: number;
  buyTradeId: string | null;
}

export interface MarketPrice {
  symbol: string;
  price: number;
  updatedAt: string;
}

export interface Holding {
  symbol: string;
  companyName: string;
  totalShares: number;
  averageCost: number;
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  currentPrice: number;
  lots: BuyLot[];
}

export interface BuyLot {
  tradeId: string;
  date: string;
  quantity: number;
  remainingqty: number;
  buyPrice: number;
}


// ... existing types (Trade, MarketPrice, Holding, BuyLot, SellRecord)

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cashBalance: number;
  createdAt: string;
}

// Extend Trade to include clientId
export interface Trade {
  id: string;
  symbol: string;
  companyName: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  date: string;
  remainingqty: number;
  buyTradeId: string | null;
  clientId: string;  // new field
}