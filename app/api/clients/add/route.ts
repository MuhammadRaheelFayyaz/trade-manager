import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

function generateId(): string {
  return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, initialCapital = 0 } = body;
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const newClient = {
      id: generateId(),
      name,
      cash_balance: Number(initialCapital),
      total_profit_earned: 0,
    };
    const { data, error } = await supabase
      .from('clients')
      .insert([newClient])
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}