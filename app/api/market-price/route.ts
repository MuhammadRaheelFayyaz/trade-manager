import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, price } = body;

    if (!symbol || price === undefined) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { error } = await supabase
      .from('market_prices')
      .upsert({ symbol: symbol.toUpperCase(), price: Number(price), updatedAt: new Date().toISOString() });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}