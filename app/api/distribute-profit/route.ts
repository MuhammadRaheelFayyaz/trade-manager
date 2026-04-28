import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

function generateId(): string {
  return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6);
}

export async function POST(request: NextRequest) {
  try {
    const { periodStart, periodEnd } = await request.json();
    if (!periodStart || !periodEnd) {
      return NextResponse.json({ error: 'Missing period' }, { status: 400 });
    }

    // 1. Get all sell trades within period
    const { data: sellTrades, error: sellsError } = await supabase
      .from('trades')
      .select('*')
      .eq('side', 'sell')
      .gte('date', periodStart)
      .lte('date', periodEnd);

    if (sellsError) throw sellsError;
    if (!sellTrades || sellTrades.length === 0) {
      return NextResponse.json({ success: false, message: 'No sell trades in this period' }, { status: 400 });
    }

    // 2. Calculate total realized profit
    const buyIds = sellTrades.map(s => s.buytradeid).filter(id => id);
    if (buyIds.length === 0) {
      return NextResponse.json({ success: false, message: 'Sell trades missing buyTradeId' }, { status: 400 });
    }

    const { data: buyTrades, error: buysError } = await supabase
      .from('trades')
      .select('*')
      .in('id', buyIds);
    if (buysError) throw buysError;

    const buyMap = new Map(buyTrades.map(b => [b.id, b]));
    let totalRealizedProfit = 0;
    for (const sell of sellTrades) {
      const buy = buyMap.get(sell.buytradeid);
      if (buy) totalRealizedProfit += (sell.price - buy.price) * sell.quantity;
    }

    // 3. Get clients with cash balances
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, cash_balance');
    if (clientsError) throw clientsError;

    const totalCapital = clients.reduce((sum, c) => sum + (c.cash_balance || 0), 0);
    if (totalCapital === 0) {
      return NextResponse.json({ success: false, message: 'No client capital' }, { status: 400 });
    }

    // 4. Distribute and build breakdown
    const updates = [];
    const breakdown = [];
    for (const client of clients) {
      const share = (client.cash_balance || 0) / totalCapital;
      const clientProfit = totalRealizedProfit * share;
      updates.push({ id: client.id, });
      breakdown.push({
        clientId: client.id,
        clientName: client.name,
        share: share * 100,
        profit: clientProfit,
      });
    }
  
    return NextResponse.json({
      success: true,
      totalProfit: totalRealizedProfit,
      breakdown,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message, success: false }, { status: 500 });
  }
}