import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', params.id)
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { cashBalance } = body;
    const { data, error } = await supabase
      .from('clients')
      .update({ cash_balance: cashBalance })
      .eq('id', params.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check if client has any trades
    const { count, error: countError } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', params.id);
    if (countError) throw countError;
    if (count && count > 0) {
      return NextResponse.json({ error: 'Cannot delete client with existing trades' }, { status: 400 });
    }
    const { error } = await supabase.from('clients').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}