import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

function generateId(): string {
  return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, companyName, quantity, price, date } = body;

    if (!symbol || !companyName || !quantity || !price || !date) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // if (!clientId) return NextResponse.json({ error: 'Client ID required' }, { status: 400 });

    const newTrade = {
    id: generateId(),
    symbol: symbol.toUpperCase(),
    companyname:companyName,
    side: 'buy',
    quantity: Number(quantity),
    price: Number(price),
    date,
    remainingqty: Number(quantity),
    buytradeid: null,
    // client_id: clientId,
    };

    const { error } = await supabase.from('trades').insert([newTrade]);
    if (error) throw error;

    return NextResponse.json({ success: true, trade: newTrade });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}