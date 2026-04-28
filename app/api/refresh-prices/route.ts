import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

async function fetchPSXPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://dps.psx.com.pk/timeseries/int/${symbol}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !Array.isArray(data.data) || data.data.length === 0) return null;
    const latest = data.data[data.data.length - 1];
    const price = latest[1];
    return typeof price === 'number' ? price : null;
  } catch (err) {
    console.error(`Failed ${symbol}:`, err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get all symbols with active holdings
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('symbol')
      .eq('side', 'buy')
      .gt('remainingqty', 0);

    if (tradesError) throw tradesError;

    const symbols = [...new Set(trades.map(t => t.symbol))];
    if (symbols.length === 0) {
      return NextResponse.json({ success: false, message: 'No holdings' }, { status: 400 });
    }

    // Fetch prices in parallel
    const pricePromises = symbols.map(s => fetchPSXPrice(s));
    const prices = await Promise.all(pricePromises);
    const updates = [];
    for (let i = 0; i < symbols.length; i++) {
      if (prices[i] !== null) {
        updates.push({
          symbol: symbols[i],
          price: prices[i]!,
          updatedat: new Date().toISOString(),
        });
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, message: 'No prices fetched' }, { status: 500 });
    }
    // Upsert to market_prices
    const { error: upsertError } = await supabase
      .from('market_prices')
      .upsert(updates, { onConflict: 'symbol' });

    if (upsertError) throw upsertError;

    return NextResponse.json({ success: true, count: updates.length, total: symbols.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}