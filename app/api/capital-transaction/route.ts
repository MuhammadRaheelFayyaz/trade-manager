import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

function generateId(): string {
  return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6);
}

export async function POST(request: NextRequest) {
  try {
    const { clientId, amount, type, description } = await request.json();
    if (!clientId || !amount || !type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Start a transaction (Supabase does not support transactions easily, but we can update sequentially)
    // Fetch current client
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('cash_balance')
      .eq('id', clientId)
      .single();
    if (fetchError) throw fetchError;

    let newBalance = client.cash_balance;
    if (type === 'deposit') newBalance += amount;
    else if (type === 'withdrawal') newBalance -= amount;
    else return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    // Update client balance
    const { error: updateError } = await supabase
      .from('clients')
      .update({ cash_balance: newBalance })
      .eq('id', clientId);
    if (updateError) throw updateError;

    // Record transaction
    const transaction = {
      id: generateId(),
      client_id: clientId,
      amount: amount,
      type,
      description: description || `${type} by user`,
    };
    const { error: txnError } = await supabase
      .from('capital_transactions')
      .insert([transaction]);
    if (txnError) throw txnError;

    return NextResponse.json({ success: true, newBalance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}