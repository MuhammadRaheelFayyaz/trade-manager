import { NextRequest, NextResponse } from 'next/server';
import { readTrades, readMarketPrices, writeMarketPrices } from '@/app/lib/csv';
import { MarketPrice } from '@/app/types';

// Helper: fetch price for a single symbol from PSX API
async function fetchPSXPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://dps.psx.com.pk/timeseries/int/${symbol}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TradeManager/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`PSX API error for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Expected format: { status: 1, message: "", data: [[timestamp, price, volume], ...] }
    if (data.status !== 1 || !Array.isArray(data.data) || data.data.length === 0) {
      console.warn(`Invalid response for ${symbol}:`, data);
      return null;
    }

    // The data array is sorted by timestamp (most recent last? Let's take the last element)
    const latestTrade = data.data[data.data.length - 1];
    const price = latestTrade[1]; // price is the second element (index 1)

    if (typeof price !== 'number' || isNaN(price)) {
      console.warn(`Invalid price value for ${symbol}:`, price);
      return null;
    }

    return price;
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Get all unique symbols from buy trades that have remaining quantity
    const trades = await readTrades();
    const symbols = [...new Set(
      trades.filter(t => t.side === 'buy' && t.remainingQty > 0).map(t => t.symbol)
    )];

    if (symbols.length === 0) {
      return NextResponse.json({ success: false, message: 'No holdings found' }, { status: 400 });
    }

    // 2. Fetch prices for all symbols in parallel (limit concurrency to avoid overwhelming)
    const fetchPromises = symbols.map(symbol => fetchPSXPrice(symbol));
    const prices = await Promise.all(fetchPromises);

    // 3. Build array of successful price updates
    const successfulUpdates: MarketPrice[] = [];
    for (let i = 0; i < symbols.length; i++) {
      if (prices[i] !== null) {
        successfulUpdates.push({
          symbol: symbols[i],
          price: prices[i]!,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (successfulUpdates.length === 0) {
      return NextResponse.json({ success: false, message: 'Could not fetch any prices' }, { status: 500 });
    }

    // 4. Merge with existing market prices
    const existingPrices = await readMarketPrices();
    const priceMap = new Map(existingPrices.map(p => [p.symbol, p]));
    for (const newPrice of successfulUpdates) {
      priceMap.set(newPrice.symbol, newPrice);
    }
    const updatedPrices = Array.from(priceMap.values());
    await writeMarketPrices(updatedPrices);

    return NextResponse.json({
      success: true,
      count: successfulUpdates.length,
      total: symbols.length,
      updatedPrices: successfulUpdates,
    });
  } catch (error) {
    console.error('Refresh API error:', error);
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}