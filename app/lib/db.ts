import { supabase } from './supabase';
import { Trade, MarketPrice } from '@/app/types';

// ---------- Trades ----------
export async function readTrades(): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error reading trades:', error);
    return [];
  }
  
  return data.map(t => ({
    ...t,
    quantity: Number(t.quantity),
    price: Number(t.price),
    remainingqty: Number(t.remainingqty),
    buyTradeId: t.buyTradeId,
  })) as Trade[];
}

export async function writeTrades(trades: Trade[]): Promise<void> {
  // For upsert (insert or update)
  const { error } = await supabase
    .from('trades')
    .upsert(trades, { onConflict: 'id' });
  
  if (error) throw new Error(`Failed to write trades: ${error.message}`);
}

// Helper to add a single trade
export async function addTrade(trade: Trade): Promise<void> {
  const { error } = await supabase
    .from('trades')
    .insert([trade]);
  
  if (error) throw new Error(`Failed to add trade: ${error.message}`);
}

// Helper to update a single trade (e.g., update remainingqty)
export async function updateTrade(trade: Trade): Promise<void> {
  const { error } = await supabase
    .from('trades')
    .update({
      remainingqty: trade.remainingqty,
      // other fields if needed
    })
    .eq('id', trade.id);
  
  if (error) throw new Error(`Failed to update trade: ${error.message}`);
}

// ---------- Market Prices ----------
export async function readMarketPrices(): Promise<MarketPrice[]> {
  const { data, error } = await supabase
    .from('market_prices')
    .select('*');
  
  if (error) {
    console.error('Error reading market prices:', error);
    return [];
  }
  
  return data.map(p => ({
    symbol: p.symbol,
    price: Number(p.price),
    updatedAt: p.updatedAt,
  })) as MarketPrice[];
}

export async function writeMarketPrices(prices: MarketPrice[]): Promise<void> {
  const { error } = await supabase
    .from('market_prices')
    .upsert(prices, { onConflict: 'symbol' });
  
  if (error) throw new Error(`Failed to write market prices: ${error.message}`);
}

// Helper to update a single market price
export async function updateMarketPrice(symbol: string, price: number): Promise<void> {
  const { error } = await supabase
    .from('market_prices')
    .upsert({ symbol, price, updatedAt: new Date().toISOString() });
  
  if (error) throw new Error(`Failed to update market price: ${error.message}`);
}