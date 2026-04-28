const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Supabase credentials (use environment variables or replace with your actual values)
const supabaseUrl = 'https://qcklzfvvdoyhevtpttiu.supabase.co/rest/v1/';
const supabaseKey ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFja2x6ZnZ2ZG95aGV2dHB0dGl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNDQ2NzMsImV4cCI6MjA5MjkyMDY3M30.9RX8_-Ky8IJ_5iXGH8gTrcfYSVVv2JZmtgvru-BcwYs';

if (!supabaseUrl || !supabaseKey) {
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to read CSV
function readCSV(filePath) {
  const content = fs.readFileSync(path.join(__dirname, '..', filePath), 'utf-8');
  return csv.parse(content, { columns: true, skip_empty_lines: true });
}

async function migrate() {

  // 1. Import clients
  const clients = readCSV('data/clients.csv');
  for (const client of clients) {
    const { error } = await supabase
      .from('clients')
      .upsert({
        id: client.id,
        name: client.name,
        created_at: client.createdAt,
        cash_balance: 0, // will be updated from capital_transactions or set default 0
        total_profit_earned: 0,
      }, { onConflict: 'id' });
    if (error) console.error('Client error:', client.id, error.message);
  }

  // 2. Import market prices
  const prices = readCSV('data/market_prices.csv');
  for (const price of prices) {
    const { error } = await supabase
      .from('market_prices')
      .upsert({
        symbol: price.symbol,
        price: parseFloat(price.price),
        updatedAt: price.updatedAt,
      }, { onConflict: 'symbol' });
    if (error) console.error('Price error:', price.symbol, error.message);
  }

  // 3. Import trades (no client_id initially)
  const trades = readCSV('data/trades.csv');
  // Optional: create a default client for unassigned trades
  let defaultClientId = null;
  const { data: existingDefault } = await supabase
    .from('clients')
    .select('id')
    .eq('name', 'Legacy Trades')
    .single();
  if (!existingDefault) {
    const { data: newDefault, error: defError } = await supabase
      .from('clients')
      .insert({ id: 'legacy-default', name: 'Legacy Trades', cash_balance: 0 })
      .select()
      .single();
    if (!defError) defaultClientId = newDefault.id;
  } else {
    defaultClientId = existingDefault.id;
  }

  for (const trade of trades) {
    const { error } = await supabase
      .from('trades')
      .upsert({
        id: trade.id,
        symbol: trade.symbol,
        companyName: trade.companyName,
        side: trade.side,
        quantity: parseInt(trade.quantity),
        price: parseFloat(trade.price),
        date: trade.date,
        remainingqty: parseInt(trade.remainingqty),
        buyTradeId: trade.buyTradeId === 'null' ? null : trade.buyTradeId,
        client_id: defaultClientId, // assign all to legacy client
      }, { onConflict: 'id' });
    if (error) console.error('Trade error:', trade.id, error.message);
  }

  // 4. Import capital transactions (if file exists)
  const capitalTxnPath = 'data/capital_transactions.csv';
  if (fs.existsSync(path.join(__dirname, '..', capitalTxnPath))) {
    const txns = readCSV(capitalTxnPath);
    for (const txn of txns) {
      // date column exists in capital_transactions.csv
      const { error } = await supabase
        .from('capital_transactions')
        .insert({
          id: txn.id,
          client_id: txn.clientId,
          amount: Math.abs(parseFloat(txn.amount)),
          type: txn.type,
          description: txn.description,
          created_at: txn.date,
        });
      if (error) console.error('Capital txn error:', txn.id, error.message);
    }
  }

  // 5. Update client cash_balance from capital transactions
  const { data: allClients } = await supabase.from('clients').select('id');
  for (const client of allClients) {
    const { data: txns } = await supabase
      .from('capital_transactions')
      .select('amount, type')
      .eq('client_id', client.id);
    let balance = 0;
    for (const t of txns || []) {
      if (t.type === 'deposit') balance += t.amount;
      else balance -= t.amount;
    }
    await supabase.from('clients').update({ cash_balance: balance }).eq('id', client.id);
  }

}

migrate().catch(console.error);