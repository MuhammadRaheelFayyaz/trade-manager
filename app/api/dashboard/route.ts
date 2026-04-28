import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET() {
  try {
    // Get all trades
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .order('date', { ascending: false });

    if (tradesError) throw tradesError;

    // Get market prices
    const { data: marketPrices, error: pricesError } = await supabase
      .from('market_prices')
      .select('*');

    if (pricesError) throw pricesError;

    const priceMap = new Map(marketPrices.map(p => [p.symbol, p.price]));

    // Active buys (remainingqty > 0)
    const buyTrades = trades.filter(t => t.side === 'buy' && t.remainingqty > 0);
    const holdingsMap = new Map();

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
        holdingsMap.set(buy.symbol, {
          companyName: buy.companyName,
          totalShares: buy.remainingqty,
          totalCost: cost,
          currentPrice: priceMap.get(buy.symbol) || buy.price,
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

    // Sell records for realized P&L
    const sellTrades = trades.filter(t => t.side === 'sell');
    const sellRecords = [];
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

    return NextResponse.json({
      holdings,
      totalPortfolioValue,
      sellRecords,
      priceMap: Object.fromEntries(priceMap),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}