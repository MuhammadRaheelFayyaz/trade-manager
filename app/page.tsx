'use client';
import { useEffect, useState } from 'react';
import HoldingsTable from './components/HoldingsTable';
import AddBuyForm from './components/AddBuyForm';
import PnLReport from './components/PnLReport';
import { Holding } from '@/app/types';

export default function Home() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setHoldings(data.holdings);
      setTotalValue(data.totalPortfolioValue);
      setPriceMap(data.priceMap);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function refreshAllPrices() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/refresh-prices', { method: 'POST' });
      const result = await res.json();
      if (result.success) await loadData();
      else alert('Failed to fetch some prices');
    } catch (err) { alert('Error refreshing prices'); }
    finally { setRefreshing(false); }
  }

  useEffect(() => { loadData(); }, []);

  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Trade Manager with PSX Live Prices</h1>
          <button onClick={refreshAllPrices} disabled={refreshing} className="bg-green-600 text-white px-4 py-2 rounded">{refreshing ? 'Refreshing...' : 'Refresh All Prices'}</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded shadow p-4"><div className="text-lg font-semibold">Portfolio Value</div><div className="text-2xl font-bold">{totalValue?.toFixed(2)} PKR</div></div>
            <HoldingsTable holdings={holdings} totalPortfolioValue={totalValue} onRefresh={loadData} />
            <PnLReport />
          </div>
          <div className="space-y-6">
            <AddBuyForm onSuccess={loadData} />
          </div>
        </div>
      </div>
    </div>
  );
}