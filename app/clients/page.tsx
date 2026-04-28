'use client';

import { useEffect, useState } from 'react';
import { getClientsWithCapital, addClient, addCapitalTransaction, distributeProfitForPeriod, getClientProfitForPeriod } from '@/app/actions-clients';

type ProfitResult = { success: false; message: string } | { success: true; totalProfit: number; distributed: number };

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [txnAmount, setTxnAmount] = useState<number>(0);
  const [txnType, setTxnType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [profitResult, setProfitResult] = useState<ProfitResult | null>(null);
  const [totalCapital, setTotalCapital] = useState(0);
  const [globalCash, setGlobalCash] = useState(0);
  const [globalInvested, setGlobalInvested] = useState(0);
  const [globalStockValue, setGlobalStockValue] = useState(0);

  async function loadData() {
    setLoading(true);
    const data = await getClientsWithCapital();
    setClients(data.clientData);
    setTotalCapital(data.totalCapital || 0);
    setGlobalCash(data.globalCash || 0);
    setGlobalInvested(data.globalInvested || 0);
    setGlobalStockValue(data.globalStockValue || 0);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddClient(formData: FormData) {
    await addClient(formData);
    setShowAddClient(false);
    loadData();
  }

  async function handleCapitalTransaction(clientId: string) {
    const formData = new FormData();
    formData.append('clientId', clientId);
    formData.append('amount', String(txnAmount));
    formData.append('type', txnType);
    formData.append('description', `${txnType} by user`);
    await addCapitalTransaction(formData);
    setSelectedClient(null);
    setTxnAmount(0);
    loadData();
  }

  async function handleDistributeProfit() {
    if (!periodStart || !periodEnd) {
      alert('Select date range');
      return;
    }
    const result = await distributeProfitForPeriod(periodStart, periodEnd) as ProfitResult;
    setProfitResult(result);
    if (result.success) {
      loadData();
      setTimeout(() => setProfitResult(null), 3000);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Client Capital Management</h1>
          <button onClick={() => setShowAddClient(true)} className="bg-blue-600 text-white px-4 py-2 rounded">+ Add Client</button>
        </div>
            <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex flex-wrap gap-4">
                <div><div className="text-sm text-gray-500">Total Capital</div><div className="text-xl font-bold">{totalCapital.toFixed(2)} PKR</div></div>
                <div><div className="text-sm text-gray-500">Total Cash</div><div className="text-xl font-bold">{(totalCapital - globalInvested).toFixed(2)} PKR</div></div>
                <div><div className="text-sm text-gray-500">Total Invested</div><div className="text-xl font-bold">{globalInvested.toFixed(2)} PKR</div></div>
                <div><div className="text-sm text-gray-500">Portfolio Value</div><div className="text-xl font-bold">{globalStockValue.toFixed(2)} PKR</div></div>
            </div>
            </div>
        {/* Client Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto mb-8">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr><th className="px-4 py-3 text-left">Client</th><th className="px-4 py-3 text-right">Current Capital</th><th className="px-4 py-3 text-right">Total Profit Earned</th><th className="px-4 py-3 text-center">Actions</th></tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2 text-right">{c.currentCapital.toFixed(2)} PKR</td>
                  <td className="px-4 py-2 text-right">{c.totalProfitEarned.toFixed(2)} PKR</td>
                  <td className="px-4 py-2 text-center flex gap-2 justify-center">
                    <button onClick={() => { setSelectedClient(c.id); setTxnType('deposit'); setTxnAmount(0); }} className="text-blue-600 mr-2">Deposit</button>
                    <div className='mx-2'>|</div>
                    <button onClick={() => { setSelectedClient(c.id); setTxnType('withdrawal'); setTxnAmount(0); }} className="text-red-600">Withdraw</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        

        {/* Profit Distribution Panel */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Distribute Monthly Profit</h2>
          <div className="flex gap-4 items-end">
            <div><label className="block text-sm">Period Start</label><input type="date" className="border rounded px-3 py-2" value={periodStart} onChange={e => setPeriodStart(e.target.value)} /></div>
            <div><label className="block text-sm">Period End</label><input type="date" className="border rounded px-3 py-2" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} /></div>
            <button onClick={handleDistributeProfit} className="bg-green-600 text-white px-4 py-2 rounded">Distribute Realized Profit</button>
          </div>
          {profitResult && (
            <div className={`mt-4 p-2 rounded ${profitResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {profitResult.success ? `Profit distributed: ${profitResult.totalProfit} PKR` : profitResult.message}
            </div>
          )}
        </div>

        {/* Add Client Modal */}
        {showAddClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center mb-2">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-bold mb-4">New Client</h3>
              <form action={handleAddClient}>
                <input name="name" placeholder="Client Name" required className="w-full border rounded px-3 py-2 mb-4" />
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">Add</button>
                <button type="button" onClick={() => setShowAddClient(false)} className="w-full mt-2 bg-red-600 text-white py-2 rounded">Cancel</button>
              </form>
            </div>
          </div>
        )}

        {/* Deposit/Withdraw Modal */}
        {selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-bold mb-4">{txnType === 'deposit' ? 'Deposit' : 'Withdraw'} for {clients.find(c => c.id === selectedClient)?.name}</h3>
              <input type="number" placeholder="Amount" value={txnAmount} onChange={e => setTxnAmount(Number(e.target.value))} className="w-full border rounded px-3 py-2 mb-4" />
              <button onClick={() => handleCapitalTransaction(selectedClient)} className="w-full bg-blue-600 text-white py-2 rounded">Confirm</button>
              <button onClick={() => setSelectedClient(null)} className="w-full mt-2 bg-red-600 text-white py-2 rounded">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}