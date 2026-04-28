'use server';

import { revalidatePath } from 'next/cache';
import { readClients, writeClients, readCapitalTransactions, writeCapitalTransactions, readProfitAllocations, writeProfitAllocations } from '@/app/lib/csv-clients';
import {  getTotalInvestedAmount, getPortfolioMarketValue, getRealizedProfitForPeriod } from './actions';
import {getGlobalCashBalance} from '@/app/lib/csv-cash';
import { ProfitAllocation } from './types';

function generateId() {
  return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6);
}

// ---- Client Management ----
export async function addClient(formData: FormData) {
  const name = formData.get('name') as string;
  if (!name) throw new Error('Name required');
  const clients: any[] = await readClients();
  clients.push({ id: generateId(), name, createdAt: new Date().toISOString() });
  await writeClients(clients);
  revalidatePath('/clients');
}

// ---- Capital Transactions (Deposit / Withdrawal) ----
export async function addCapitalTransaction(formData: FormData) {
  const clientId = formData.get('clientId') as string;
  const amount = Number(formData.get('amount'));
  const type = formData.get('type') as 'deposit' | 'withdrawal';
  const description = formData.get('description') as string || '';
  if (!clientId || !amount || !type) throw new Error('Missing fields');
  const finalAmount = type === 'deposit' ? Math.abs(amount) : -Math.abs(amount);
  const txs = await readCapitalTransactions();
  txs.push({
    id: generateId(),
    clientId,
    amount: finalAmount,
    date: new Date().toISOString().split('T')[0],
    type,
    description,
  });
  await writeCapitalTransactions(txs);
  revalidatePath('/clients');
}

// ---- Get Client Current Capital ----
export async function getClientCapital(): Promise<Map<string, number>> {
  const txs = await readCapitalTransactions();
  const capitalMap = new Map<string, number>();
  for (const tx of txs) {
    const current = capitalMap.get(tx.clientId) || 0;
    capitalMap.set(tx.clientId, current + tx.amount);
  }
  return capitalMap;
}

// ---- Get All Clients with Current Capital ----
export async function getClientsWithCapital() {
  const clients = await readClients();
  const capitalMap = await getClientCapital(); // current capital per client
  const totalCapital = Array.from(capitalMap.values()).reduce((a,b)=>a+b,0);
  const globalCash = await getGlobalCashBalance();
  const globalInvested = await getTotalInvestedAmount();
  const globalStockValue = await getPortfolioMarketValue(); // we need to create this helper
  // Actually we can use getPortfolioMarketValue from actions
  const clientData = [];
  for (const client of clients) {
    const capital = capitalMap.get(client.id) || 0;
    const ratio = totalCapital > 0 ? capital / totalCapital : 0;
    const clientCash = globalCash * ratio;
    const clientInvested = globalInvested * ratio;
    const clientStockValue = globalStockValue * ratio;
    const clientProfitEarned = await getClientTotalProfit(client.id); // sum of allocations
    clientData.push({
      ...client,
      currentCapital: capital,
      allocatedCash: clientCash,
      investedAmount: clientInvested,
      stockValue: clientStockValue,
      totalAssets: clientCash + clientStockValue,
      totalProfitEarned: clientProfitEarned,
    });
  }
  return { clientData, totalCapital, globalCash, globalInvested, globalStockValue };
}

// ---- Distribute Profit for a Period ----
// This function takes a date range, calculates total realized profit from trades,
// and distributes it to clients proportionally based on their capital at end of period.
export async function distributeProfitForPeriod(periodStart: string, periodEnd: string) {
  const totalProfit = await getRealizedProfitForPeriod(periodStart, periodEnd);
  if (totalProfit === 0) return { success: false, message: 'No profit in period' };

  const { clientData, totalCapital } = await getClientsWithCapital();
  if (totalCapital === 0) return { success: false, message: 'No capital in clients' };

  const allocations: ProfitAllocation[] = [];
  for (const client of clientData) {
    const shareRatio = client.currentCapital / totalCapital;
    const allocatedProfit = totalProfit * shareRatio;
    const newCapital = client.currentCapital + allocatedProfit;
    allocations.push({
      id: generateId(),
      clientId: client.id,
      periodStart,
      periodEnd,
      allocatedProfit,
      clientCapitalBefore: client.currentCapital,
      clientCapitalAfter: newCapital,
      totalPortfolioProfit: totalProfit,
      date: new Date().toISOString().split('T')[0],
    });
    // Record a capital transaction to reflect reinvested profit
    await addCapitalTransactionInternal(client.id, allocatedProfit, `Profit for ${periodStart} to ${periodEnd}`);
  }
  const existing = await readProfitAllocations();
  await writeProfitAllocations([...existing, ...allocations]);
  revalidatePath('/clients');
  return { success: true, totalProfit, distributed: allocations.length };
}

// Helper to add capital transaction (internal)
async function addCapitalTransactionInternal(clientId: string, amount: number, description: string) {
  const txs = await readCapitalTransactions();
  txs.push({
    id: generateId(),
    clientId,
    amount,
    date: new Date().toISOString().split('T')[0],
    type: amount >= 0 ? 'deposit' : 'withdrawal',
    description,
  });
  await writeCapitalTransactions(txs);
}

// ---- Get total profit for a specific client ----
export async function getClientTotalProfit(clientId: string) {
  const allocations = await readProfitAllocations();
  return allocations
    .filter((alloc) => alloc.clientId === clientId)
    .reduce((total, alloc) => total + alloc.allocatedProfit, 0);
}

// ---- Get Profit for a specific client for a date range ----
export async function getClientProfitForPeriod(clientId: string, startDate: string, endDate: string) {
  const allocations = await readProfitAllocations();
  let total = 0;
  for (const alloc of allocations) {
    if (alloc.clientId === clientId && alloc.periodStart >= startDate && alloc.periodEnd <= endDate) {
      total += alloc.allocatedProfit;
    }
  }
  return total;
}

