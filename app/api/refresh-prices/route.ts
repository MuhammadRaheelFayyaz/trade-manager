import { NextResponse } from 'next/server';
import { readTrades, readMarketPrices, writeMarketPrices } from '@/app/lib/csv';

async function fetchPSXPrice(symbol: string): Promise<number | null> {
  const url = `https://dps.psx.com.pk/timeseries/int/${symbol}`;
  console.log(`[PSX API] Fetching ${symbol} from ${url}`);
  
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.error(`HTTP ${res.status} for ${symbol}`);
      return null;
    }
    
    const data = await res.json();
    console.log(`[PSX API] Response for ${symbol}:`, JSON.stringify(data).slice(0, 200));
    
    // Expected structure: { status: 1, message: "", data: [[timestamp, price, volume], ...] }
    if (data?.status === 1 && Array.isArray(data.data) && data.data.length > 0) {
      // data.data is an array of trades; the first element is the most recent (descending timestamp)
      const latestTrade = data.data[0];
      if (Array.isArray(latestTrade) && latestTrade.length >= 2) {
        const price = latestTrade[1]; // second element is price
        if (typeof price === 'number' && !isNaN(price)) {
          console.log(`[PSX API] Success for ${symbol}: ${price}`);
          return price;
        }
      }
    }
    
    console.warn(`[PSX API] No valid price found for ${symbol}`);
    return null;
  } catch (err) {
    console.error(`[PSX API] Error for ${symbol}:`, err);
    return null;
  }
}

export async function GET() {
  console.log('[API] refresh-prices called');
  try {
    const trades = await readTrades();
    const symbols = [...new Set(trades.filter(t => t.side === 'buy').map(t => t.symbol))];
    console.log('[API] Symbols to fetch:', symbols);
    
    if (symbols.length === 0) {
      return NextResponse.json({ success: false, message: 'No holdings found' });
    }

    const results = await Promise.all(symbols.map(async (symbol) => {
      const price = await fetchPSXPrice(symbol);
      console.log(`[API] Fetched price for ${symbol}:`, price);
      return { symbol, price, updatedAt: new Date().toISOString() };
    }));

    const valid = results.filter(r => r.price !== null);
    console.log(`[API] Fetched prices:`, valid);
    console.log(`[API] Valid results: ${valid.length} of ${symbols.length}`);
    
    if (valid.length === 0) {
      return NextResponse.json({ success: false, message: 'Could not fetch any prices' });
    }

    const existingPrices = await readMarketPrices();
    const priceMap = new Map(existingPrices.map(p => [p.symbol, p]));
    for (const v of valid) {
      priceMap.set(v.symbol, { symbol: v.symbol, price: v.price!, updatedAt: v.updatedAt });
    }
    await writeMarketPrices(Array.from(priceMap.values()));

    return NextResponse.json({ success: true, count: valid.length });
  } catch (error: any) {
    console.error('[API] error:', error);
    return NextResponse.json({ success: false, message: error.message });
  }
}