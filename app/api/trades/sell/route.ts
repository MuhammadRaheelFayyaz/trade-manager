import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

function generateId(): string {
  return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buyTradeId, quantity, price, date } = body;

    if (!buyTradeId || !quantity || !price || !date) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Get the buy trade
    const { data: buyTrade, error: fetchError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', buyTradeId)
      .single();

    if (fetchError || !buyTrade) {
      return NextResponse.json({ error: 'Buy trade not found' }, { status: 404 });
    }

    if (quantity > buyTrade.remainingqty) {
      return NextResponse.json({ error: 'Not enough shares' }, { status: 400 });
    }

    // Update remaining quantity of buy trade
    const newremainingqty = buyTrade.remainingqty - quantity;
    const { error: updateError } = await supabase
      .from('trades')
      .update({ remainingqty: newremainingqty })
      .eq('id', buyTradeId);

    if (updateError) throw updateError;

    // Create sell trade
    const sellTrade = {
      id: generateId(),
      symbol: buyTrade.symbol,
      companyName: buyTrade.companyName,
      side: 'sell',
      quantity: Number(quantity),
      price: Number(price),
      date,
      remainingqty: 0,
      buyTradeId: buyTrade.id,
    };

    const { error: insertError } = await supabase.from('trades').insert([sellTrade]);
    if (insertError) throw insertError;

    return NextResponse.json({ success: true, sellTrade });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}