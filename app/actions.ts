'use server';

import { revalidatePath } from 'next/cache';
import { readTrades, writeTrades, readMarketPrices, writeMarketPrices } from '@/app/lib/csv';
import { Trade, SellRecord, CashTransaction } from '@/app/types';
import { readCashTransactions, writeCashTransactions, getGlobalCashBalance } from '@/app/lib/csv-cash';


function generateId(): string {
  return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6);
}

// ---------- Trade Management ----------
export async function addBuyTrade(formData: FormData) {
  const symbol = (formData.get('symbol') as string).toUpperCase();
  const companyName = formData.get('companyName') as string;
  const quantity = Number(formData.get('quantity'));
  const price = Number(formData.get('price'));
  const date = formData.get('date') as string;

  if (!symbol || !companyName || !quantity || !price || !date) throw new Error('Missing fields');

  const trades = await readTrades();
  const newTrade: Trade = {
    id: generateId(),
    symbol,
    companyName,
    side: 'buy',
    quantity,
    price,
    date,
    remainingQty: quantity,
    buyTradeId: null,
  };
  trades.push(newTrade);
  await writeTrades(trades);

  const totalCost = quantity * price;
  const cashTx: CashTransaction = {
    id: generateId(),
    amount: -totalCost,
    date,
    type: 'buy',
    description: `Bought ${quantity} ${symbol} @ ${price}`,
    clientId: null,
  };
  const existingCash = await readCashTransactions();
  existingCash.push(cashTx);
  await writeCashTransactions(existingCash);

  revalidatePath('/');
}

export async function addSellTrade(formData: FormData) {
  const buyTradeId = formData.get('buyTradeId') as string;
  const quantity = Number(formData.get('quantity'));
  const price = Number(formData.get('price'));
  const date = formData.get('date') as string;

  if (!buyTradeId || !quantity || !price || !date) throw new Error('Missing fields');

  const trades = await readTrades();
  const buyTradeIndex = trades.findIndex(t => t.id === buyTradeId && t.side === 'buy');
  if (buyTradeIndex === -1) throw new Error('Buy trade not found');

  const buyTrade = trades[buyTradeIndex];
  if (quantity > buyTrade.remainingQty) throw new Error('Not enough shares');

  buyTrade.remainingQty -= quantity;
  trades[buyTradeIndex] = buyTrade;

  const sellTrade: Trade = {
    id: generateId(),
    symbol: buyTrade.symbol,
    companyName: buyTrade.companyName,
    side: 'sell',
    quantity,
    price,
    date,
    remainingQty: 0,
    buyTradeId: buyTrade.id,
  };
  trades.push(sellTrade);
  await writeTrades(trades);
  // After sell trade, record cash inflow
    const totalProceeds = quantity * price;
    const cashTx: CashTransaction = {
    id: generateId(),
    amount: totalProceeds,
    date: date,
    type: 'sell',
    description: `Sold ${quantity} ${buyTrade.symbol} @ ${price}`,
    clientId: null,
    };
    const existingCash = await readCashTransactions();
    existingCash.push(cashTx);
    await writeCashTransactions(existingCash);
  revalidatePath('/');
}

// ---------- Edit & Delete Holdings ----------
export async function updateBuyTrade(formData: FormData) {
  const tradeId = formData.get('tradeId') as string;
  const quantity = Number(formData.get('quantity'));
  const price = Number(formData.get('price'));
  const date = formData.get('date') as string;

  if (!tradeId || !quantity || !price || !date) throw new Error('Missing fields');

  const trades = await readTrades();
  const tradeIndex = trades.findIndex(t => t.id === tradeId && t.side === 'buy');
  if (tradeIndex === -1) throw new Error('Trade not found');

  const oldTrade = trades[tradeIndex];
  const soldQuantity = oldTrade.quantity - oldTrade.remainingQty; // already sold shares

  if (quantity < soldQuantity) {
    throw new Error(`Cannot reduce quantity below already sold amount (${soldQuantity})`);
  }

  // Update the trade
  trades[tradeIndex] = {
    ...oldTrade,
    quantity,
    price,
    date,
    remainingQty: quantity - soldQuantity,
  };

  await writeTrades(trades);
  revalidatePath('/');
}

export async function deleteBuyTrade(tradeId: string) {
  const trades = await readTrades();
  const tradeIndex = trades.findIndex(t => t.id === tradeId && t.side === 'buy');
  if (tradeIndex === -1) throw new Error('Trade not found');

  // Remove all associated sell trades
  const updatedTrades = trades.filter(t => {
    if (t.side === 'sell' && t.buyTradeId === tradeId) return false;
    if (t.id === tradeId) return false;
    return true;
  });

  await writeTrades(updatedTrades);
  revalidatePath('/');
}

// ---------- PSX API Integration ----------
export async function fetchPSXPrice(symbol: string): Promise<number | null> {
  const url = `https://dps.psx.com.pk/timeseries/int?symbol=${symbol}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.status === 1 && Array.isArray(data.data) && data.data.length > 0) {
      const price = data.data[0][1];
      if (typeof price === 'number') return price;
    }
    return null;
  } catch {
    return null;
  }
}

export async function refreshAllMarketPrices() {
  const trades = await readTrades();
  const symbols = [...new Set(trades.filter(t => t.side === 'buy').map(t => t.symbol))];
  if (symbols.length === 0) return { success: false, message: 'No holdings' };

  const results = await Promise.all(symbols.map(async (symbol) => {
    const price = await fetchPSXPrice(symbol);
    return { symbol, price, updatedAt: new Date().toISOString() };
  }));

  const valid = results.filter(r => r.price !== null);
  if (valid.length === 0) return { success: false, message: 'Could not fetch any prices' };

  const existingPrices = await readMarketPrices();
  const priceMap = new Map(existingPrices.map(p => [p.symbol, p]));
  for (const v of valid) {
    priceMap.set(v.symbol, { symbol: v.symbol, price: v.price!, updatedAt: v.updatedAt });
  }
  await writeMarketPrices(Array.from(priceMap.values()));
  revalidatePath('/');
  return { success: true, count: valid.length };
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

// ---------- Dashboard ----------
export async function getDashboardData() {
  const trades = await readTrades();
  const marketPrices = await readMarketPrices();
  const priceMap = new Map(marketPrices.map(p => [p.symbol, p.price]));
  
  const buyTrades = trades.filter(t => t.side === 'buy' && t.remainingQty > 0);
  const holdingsMap = new Map<string, {
    companyName: string;
    totalShares: number;
    totalCost: number;
    currentPrice: number;
    lots: any[];
    originalBuyTrades: any[];
  }>();
  
  for (const buy of buyTrades) {
    const existing = holdingsMap.get(buy.symbol);
    const cost = buy.remainingQty * buy.price;
    if (existing) {
      existing.totalShares += buy.remainingQty;
      existing.totalCost += cost;
      existing.lots.push({
        tradeId: buy.id,
        date: buy.date,
        quantity: buy.remainingQty,
        buyPrice: buy.price,
        remainingQty: buy.remainingQty,
      });
      existing.originalBuyTrades.push(buy);
    } else {
      const currentPrice = priceMap.get(buy.symbol) || buy.price;
      holdingsMap.set(buy.symbol, {
        companyName: buy.companyName,
        totalShares: buy.remainingQty,
        totalCost: cost,
        currentPrice,
        lots: [{
          tradeId: buy.id,
          date: buy.date,
          quantity: buy.remainingQty,
          buyPrice: buy.price,
          remainingQty: buy.remainingQty,
        }],
        originalBuyTrades: [buy],
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
      originalBuyTrades: data.originalBuyTrades,
    };
  });
  
  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  
  const sellTrades = trades.filter(t => t.side === 'sell');
  const sellRecords: SellRecord[] = [];
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

export async function getPortfolioSummary() {
  const { holdings, totalPortfolioValue } = await getDashboardData();
  
  let totalInvested = 0;
  let totalRealizedPnL = 0;
  
  // Calculate total invested from holdings (cost basis of remaining shares)
  for (const h of holdings) {
    totalInvested += h.invested;
  }
  
  // Realized P&L (from sell records)
  const trades = await readTrades();
  const sellTrades = trades.filter(t => t.side === 'sell');
  for (const sell of sellTrades) {
    const buyTrade = trades.find(t => t.id === sell.buyTradeId);
    if (buyTrade) {
      totalRealizedPnL += (sell.price - buyTrade.price) * sell.quantity;
    }
  }
  
  // Unrealized P&L (current value minus invested)
  const totalUnrealizedPnL = totalPortfolioValue - totalInvested;
  
  return {
    totalInvested,
    totalPortfolioValue,
    totalRealizedPnL,
    totalUnrealizedPnL,
    totalProfitLoss: totalRealizedPnL + totalUnrealizedPnL, // overall gain/loss
  };
}

export async function getRealizedProfitForPeriod(startDate: string, endDate: string): Promise<number> {
  const trades = await readTrades();
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  let profit = 0;
  for (const sell of trades.filter(t => t.side === 'sell')) {
    const sellDate = new Date(sell.date);
    if (sellDate >= start && sellDate <= end) {
      const buyTrade = trades.find(t => t.id === sell.buyTradeId);
      if (buyTrade) profit += (sell.price - buyTrade.price) * sell.quantity;
    }
  }
  return profit;
}


export async function getPortfolioMarketValue(): Promise<number> {
  const { totalPortfolioValue } = await getDashboardData();
  return totalPortfolioValue;
}

export async function getTotalInvestedAmount(): Promise<number> {
  const trades = await readTrades();
  let invested = 0;
  for (const t of trades) {
    if (t.side === 'buy') {
      invested += t.remainingQty * t.price;
    }
  }
  return invested;
}
export async function getPortfolioSummaryWithCash() {
  const investedAmount = await getTotalInvestedAmount();
  const portfolioMarketValue = await getPortfolioMarketValue();
  const unrealizedPnL = portfolioMarketValue - investedAmount;
  const cashBalance = await getGlobalCashBalance();
  const totalAssets = cashBalance + portfolioMarketValue;

  return {
    cashBalance,
    investedAmount,
    portfolioMarketValue,
    totalAssets,
    unrealizedPnL,
  };
}