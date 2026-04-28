import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { Client, CapitalTransaction, ProfitAllocation } from '@/app/types';

const dataDir = path.join(process.cwd(), 'data');
const clientsFile = path.join(dataDir, 'clients.csv');
const capitalTransactionsFile = path.join(dataDir, 'capital_transactions.csv');
const profitAllocationsFile = path.join(dataDir, 'profit_allocations.csv');

export async function readClients(): Promise<Client[]> {
  try {
    const content = await fs.readFile(clientsFile, 'utf-8');
    const records: any[] = parse(content, { columns: true, skip_empty_lines: true });
    return records.map(r => ({ ...r, id: r.id }));
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(clientsFile, 'id,name,createdAt\n');
      return [];
    }
    throw err;
  }
}

export async function writeClients(clients: Client[]) {
  const csv = stringify(clients, { header: true });
  await fs.writeFile(clientsFile, csv);
}

export async function readCapitalTransactions(): Promise<CapitalTransaction[]> {
  try {
    const content = await fs.readFile(capitalTransactionsFile, 'utf-8');
    const records:any[] = parse(content, { columns: true, skip_empty_lines: true });
    return records.map(r => ({ ...r, amount: Number(r.amount) }));
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(capitalTransactionsFile, 'id,clientId,amount,date,type,description\n');
      return [];
    }
    throw err;
  }
}

export async function writeCapitalTransactions(txs: CapitalTransaction[]) {
  const csv = stringify(txs, { header: true });
  await fs.writeFile(capitalTransactionsFile, csv);
}

export async function readProfitAllocations(): Promise<ProfitAllocation[]> {
  try {
    const content = await fs.readFile(profitAllocationsFile, 'utf-8');
    const records:any[] = parse(content, { columns: true, skip_empty_lines: true });
    return records.map(r => ({
      ...r,
      allocatedProfit: Number(r.allocatedProfit),
      clientCapitalBefore: Number(r.clientCapitalBefore),
      clientCapitalAfter: Number(r.clientCapitalAfter),
      totalPortfolioProfit: Number(r.totalPortfolioProfit),
    }));
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(profitAllocationsFile, 'id,clientId,periodStart,periodEnd,allocatedProfit,clientCapitalBefore,clientCapitalAfter,totalPortfolioProfit,date\n');
      return [];
    }
    throw err;
  }
}

export async function writeProfitAllocations(alloc: ProfitAllocation[]) {
  const csv = stringify(alloc, { header: true });
  await fs.writeFile(profitAllocationsFile, csv);
}