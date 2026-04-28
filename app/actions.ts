'use server';

import { revalidatePath } from 'next/cache';
import { readTrades, addTrade, updateTrade, readMarketPrices, writeMarketPrices } from '@/app/lib/db';
import { Trade } from '@/app/types';

function generateId(): string {
  return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6);
}

export async function addBuyTrade(formData: FormData) {
  const symbol = (formData.get('symbol') as string).toUpperCase();
  const companyName = formData.get('companyName') as string;
  const quantity = Number(formData.get('quantity'));
  const price = Number(formData.get('price'));
  const date = formData.get('date') as string;
  const clientId = formData.get('clientId') as string;

  if (!symbol || !companyName || !quantity || !price || !date || !clientId) throw new Error('Missing fields');

  const newTrade: Trade = {
    id: generateId(),
    symbol,
    companyName,
    side: 'buy',
    quantity,
    price,
    date,
    remainingqty: quantity,
    buyTradeId: null,
    clientId,
  };
  await addTrade(newTrade);
  revalidatePath('/');
}

export async function addSellTrade(formData: FormData) {
  const buyTradeId = formData.get('buyTradeId') as string;
  const quantity = Number(formData.get('quantity'));
  const price = Number(formData.get('price'));
  const date = formData.get('date') as string;

  if (!buyTradeId || !quantity || !price || !date) throw new Error('Missing fields');

  const trades = await readTrades();
  const buyTrade = trades.find(t => t.id === buyTradeId && t.side === 'buy');
  if (!buyTrade) throw new Error('Buy trade not found');
  if (quantity > buyTrade.remainingqty) throw new Error('Not enough shares');

  // Update the buy trade's remaining quantity
  buyTrade.remainingqty -= quantity;
  await updateTrade(buyTrade);

  // Create sell trade
  const sellTrade: Trade = {
    id: generateId(),
    symbol: buyTrade.symbol,
    companyName: buyTrade.companyName,
    side: 'sell',
    quantity,
    price,
    date,
    remainingqty: 0,
    buyTradeId: buyTrade.id,
    clientId: buyTrade.clientId,
  };
  await addTrade(sellTrade);
  revalidatePath('/');
}

// ---------- PSX API Integration (same as before) ----------
export async function fetchPSXPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://dps.psx.com.pk/timeseries/int?symbol=${symbol}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'TradeManager/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status !== 1 || !Array.isArray(data.data) || data.data.length === 0) return null;
    const latestTrade = data.data[data.data.length - 1];
    const price = latestTrade[1];
    return typeof price === 'number' ? price : null;
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error);
    return null;
  }
}

export async function updateMarketPriceManual(formData: FormData) {
  const symbol = (formData.get('symbol') as string).toUpperCase();
  const price = Number(formData.get('price'));
  if (!symbol || !price) throw new Error('Missing fields');
  
  const prices = await readMarketPrices();
  const existingIndex = prices.findIndex(p => p.symbol === symbol);
  const updatedPrice = { symbol, price, updatedAt: new Date().toISOString() };
  if (existingIndex >= 0) {
    prices[existingIndex] = updatedPrice;
  } else {
    prices.push(updatedPrice);
  }
  await writeMarketPrices(prices);
  revalidatePath('/');
}

export async function getDashboardData() {
  const trades = await readTrades();
  const marketPrices = await readMarketPrices();
  const priceMap = new Map(marketPrices.map(p => [p.symbol, p.price]));
  
  const buyTrades = trades.filter(t => t.side === 'buy' && t.remainingqty > 0);
  const holdingsMap = new Map<string, {
    companyName: string;
    totalShares: number;
    totalCost: number;
    currentPrice: number;
    lots: any[];
  }>();
  
  for (const buy of buyTrades) {
    const existing = holdingsMap.get(buy.symbol);
    const cost = buy.remainingqty * buy.price;
    if (existing) {
      existing.totalShares += buy.remainingqty;
      existing.totalCost += cost;
      existing.lots.push({
        tradeId: buy.id,
        date: buy.date,
        quantity: buy.remainingqty,
        buyPrice: buy.price,
        remainingqty: buy.remainingqty,
      });
    } else {
      const currentPrice = priceMap.get(buy.symbol) || buy.price;
      holdingsMap.set(buy.symbol, {
        companyName: buy.companyName,
        totalShares: buy.remainingqty,
        totalCost: cost,
        currentPrice,
        lots: [{
          tradeId: buy.id,
          date: buy.date,
          quantity: buy.remainingqty,
          buyPrice: buy.price,
          remainingqty: buy.remainingqty,
        }],
      });
    }
  }
  
  const holdings = Array.from(holdingsMap.entries()).map(([symbol, data]) => {
    const currentValue = data.totalShares * data.currentPrice;
    const pnl = currentValue - data.totalCost;
    const pnlPercent = data.totalCost > 0 ? (pnl / data.totalCost) * 100 : 0;
    return {
      symbol,
      companyName: data.companyName,
      totalShares: data.totalShares,
      averageCost: data.totalCost / data.totalShares,
      currentPrice: data.currentPrice,
      invested: data.totalCost,
      currentValue,
      pnl,
      pnlPercent,
      lots: data.lots,
    };
  });
  
  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  
  const sellTrades = trades.filter(t => t.side === 'sell');
  const sellRecords: any[] = [];
  for (const sell of sellTrades) {
    const buyTrade = trades.find(t => t.id === sell.buyTradeId);
    if (buyTrade) {
      const profit = (sell.price - buyTrade.price) * sell.quantity;
      sellRecords.push({
        id: sell.id,
        symbol: sell.symbol,
        companyName: sell.companyName,
        sellDate: sell.date,
        sellPrice: sell.price,
        quantity: sell.quantity,
        buyPrice: buyTrade.price,
        profit,
        buyTradeId: buyTrade.id,
      });
    }
  }
  
  return { holdings, totalPortfolioValue, sellRecords, priceMap: Object.fromEntries(priceMap) };
}

export async function getPnLForDateRange(startDate: string, endDate: string): Promise<number> {
  const { sellRecords } = await getDashboardData();
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  return sellRecords
    .filter(sell => {
      const sellDate = new Date(sell.sellDate);
      return sellDate >= start && sellDate <= end;
    })
    .reduce((sum, sell) => sum + sell.profit, 0);
}