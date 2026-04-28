import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { CashTransaction } from '@/app/types';

const dataDir = path.join(process.cwd(), 'data');
const cashFile = path.join(dataDir, 'cash_transactions.csv');

export async function readCashTransactions(): Promise<CashTransaction[]> {
  try {
    const content = await fs.readFile(cashFile, 'utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
    return records.map(r => ({
      id: r.id,
      amount: Number(r.amount),
      date: r.date,
      type: r.type as CashTransaction['type'],
      description: r.description,
      clientId: r.clientId,
    }));
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(cashFile, 'id,amount,date,type,description,clientId\n');
      return [];
    }
    throw err;
  }
}

export async function writeCashTransactions(txs: CashTransaction[]) {
  const csv = stringify(txs, { header: true });
  await fs.writeFile(cashFile, csv);
}

export async function getGlobalCashBalance(): Promise<number> {
  const txs = await readCashTransactions();
  console.log('txs', txs)
  return txs.reduce((sum, tx) => sum + tx.amount, 0);
}