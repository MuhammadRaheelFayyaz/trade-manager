import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
    }

    // Get all sell trades within the date range
    const { data: sellTrades, error: sellsError } = await supabase
      .from('trades')
      .select('*')
      .eq('side', 'sell')
      .gte('date', startDate)
      .lte('date', endDate);

    if (sellsError) {
      console.error('Error fetching sell trades:', sellsError);
      return NextResponse.json({ error: sellsError.message }, { status: 500 });
    }

    if (!sellTrades || sellTrades.length === 0) {
      return NextResponse.json({ pnl: 0 });
    }
    // Get all unique buyTradeIds
    const buyTradeIds = sellTrades
      .map(s => s.buytradeid)
      .filter(id => id !== null && id !== 'null');

    if (buyTradeIds.length === 0) {
      return NextResponse.json({ pnl: 0 });
    }
    // Fetch the corresponding buy trades
    const { data: buyTrades, error: buysError } = await supabase
      .from('trades')
      .select('*')
      .in('id', buyTradeIds);

    if (buysError) {
      console.error('Error fetching buy trades:', buysError);
      return NextResponse.json({ error: buysError.message }, { status: 500 });
    }
    // Create a map for quick lookup
    const buyMap = new Map();
    if (buyTrades) {
      buyTrades.forEach(buy => buyMap.set(buy.id, buy));
    }
    // Calculate total realized P&L
    let totalPnL = 0;
    for (const sell of sellTrades) {
      const buy = buyMap.get(sell.buytradeid);

      if (buy) {
        const profit = (sell.price - buy.price) * sell.quantity;
        totalPnL += profit;
      }
    }

    return NextResponse.json({ pnl: totalPnL });
  } catch (error: any) {
    console.error('PNL API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}