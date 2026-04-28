// app/api/clients/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase'; // adjust path if needed

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { cashBalance } = body;
    const { data, error } = await supabase
      .from('clients')
      .update({ cash_balance: cashBalance })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    // Check if client has any trades
    const { count, error: countError } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', id);
    if (countError) throw countError;
    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with existing trades' },
        { status: 400 }
      );
    }
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}