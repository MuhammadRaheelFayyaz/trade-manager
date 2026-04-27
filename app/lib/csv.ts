import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { Trade, MarketPrice } from '../types';

const dataDir = path.join(process.cwd(), 'data');
const tradesFilePath = path.join(dataDir, 'trades.csv');
const marketPricesFilePath = path.join(dataDir, 'market_prices.csv');

export async function ensureDataDir() {
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

export async function readTrades(): Promise<Trade[]> {
  await ensureDataDir();
  try {
    const fileContent = await fs.readFile(tradesFilePath, 'utf-8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    return records.map((r: any) => ({
      ...r,
      id: r.id,
      quantity: Number(r.quantity),
      price: Number(r.price),
      remainingQty: Number(r.remainingQty),
      buyTradeId: r.buyTradeId === 'null' ? null : r.buyTradeId,
    }));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(tradesFilePath, 'id,symbol,companyName,side,quantity,price,date,remainingQty,buyTradeId\n');
      return [];
    }
    throw error;
  }
}

export async function writeTrades(trades: Trade[]): Promise<void> {
  await ensureDataDir();
  const csvData = trades.map(t => ({
    id: t.id,
    symbol: t.symbol,
    companyName: t.companyName,
    side: t.side,
    quantity: t.quantity,
    price: t.price,
    date: t.date,
    remainingQty: t.remainingQty,
    buyTradeId: t.buyTradeId || 'null',
  }));
  const csvString = stringify(csvData, { header: true });
  await fs.writeFile(tradesFilePath, csvString);
}

export async function readMarketPrices(): Promise<MarketPrice[]> {
  await ensureDataDir();
  try {
    const fileContent = await fs.readFile(marketPricesFilePath, 'utf-8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    return records.map((r: any) => ({
      symbol: r.symbol,
      price: Number(r.price),
      updatedAt: r.updatedAt,
    }));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(marketPricesFilePath, 'symbol,price,updatedAt\n');
      return [];
    }
    throw error;
  }
}

export async function writeMarketPrices(prices: MarketPrice[]): Promise<void> {
  await ensureDataDir();
  const csvString = stringify(prices, { header: true });
  await fs.writeFile(marketPricesFilePath, csvString);
}