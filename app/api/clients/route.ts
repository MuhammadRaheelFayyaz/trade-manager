import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET() {
  try {
    // Get all clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    if (clientsError) throw clientsError;

 

    const clientData = clients.map(c => ({
      id: c.id,
      name: c.name,
      currentCapital: Number(c.cash_balance),
    }));

    // Also compute global totals
    const totalCapital = clients.reduce((sum, c) => sum + Number(c.cash_balance), 0);

    // For global invested/stock value, we need to query trades (we'll do it in a separate endpoint or combine)
    // For simplicity, we'll call another endpoint for portfolio data (you already have /api/client-portfolio)
    // Let's compute global invested & stock value from all client holdings
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('side', 'buy')
      .gt('remainingqty', 0);
    if (tradesError) throw tradesError;

    let globalInvested = 0;
    for (const trade of trades) {
      globalInvested += trade.remainingqty * trade.price;
    }

    // Get market prices for stock value
    const { data: marketPrices, error: pricesError } = await supabase
      .from('market_prices')
      .select('*');
    if (pricesError) throw pricesError;
    const priceMap = new Map(marketPrices.map(p => [p.symbol, p.price]));

    let globalStockValue = 0;
    for (const trade of trades) {
      const currentPrice = priceMap.get(trade.symbol) || trade.price;
      globalStockValue += trade.remainingqty * currentPrice;
    }

    return NextResponse.json({
      clientData,
      totalCapital,
      globalCash: totalCapital - globalInvested, // cash = totalCapital - invested amount (simplified)
      globalInvested,
      globalStockValue,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}