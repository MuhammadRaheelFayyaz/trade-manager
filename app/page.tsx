'use client';

import { useEffect, useState } from 'react';
import { getDashboardData, refreshAllMarketPrices } from './actions';
import HoldingsTable from './components/HoldingsTable';
import AddBuyForm from './components/AddBuyForm';
import PnLReport from './components/PnLReport';
import { Holding } from '@/app/types';

export default function Home() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalProfitLoss, setTotalProfitLoss] = useState(0);
  const [totalProfitLossPercent, setTotalProfitLossPercent] = useState(0);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  async function loadData() {
    setLoading(true);
    try {
      const data = await getDashboardData();
      setHoldings(data.holdings);
      setTotalValue(data.totalPortfolioValue);
      setPriceMap(data.priceMap);
      
      // Calculate totals from holdings
      let invested = 0;
      let unrealizedPnl = 0;
      for (const h of data.holdings) {
        invested += h.invested;
        unrealizedPnl += h.pnl;
      }
      setTotalInvested(invested);
      setTotalProfitLoss(unrealizedPnl);
      if (invested > 0) {
        setTotalProfitLossPercent((unrealizedPnl / invested) * 100);
      } else {
        setTotalProfitLossPercent(0);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshPrices() {
    setRefreshingPrices(true);
    try {
      const result = await refreshAllMarketPrices();
      if (result.success) {
        await loadData();
        setLastRefresh(new Date());
        console.log('Prices refreshed successfully');
      } else {
        console.warn('Failed to fetch prices:', result.message);
      }
    } catch (error) {
      console.error('Error refreshing prices:', error);
    } finally {
      setRefreshingPrices(false);
    }
  }

  // Auto-refresh every minute
  useEffect(() => {
    // Initial load
    loadData();
    
    // Set up interval to refresh prices every 60 seconds
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing market prices...');
      handleRefreshPrices();
    }, 60000); // 60,000 milliseconds = 1 minute

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array ensures this runs once on mount

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <header className="mb-8">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Trade Manager with PSX Live Prices</h1>
              <p className="text-gray-600">Track holdings, partial sells, and P&L using real-time PSX data</p>
            </div>
            <div className="text-right">
              <button
                onClick={handleRefreshPrices}
                disabled={refreshingPrices}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {refreshingPrices ? 'Fetching...' : 'Refresh Now'}
              </button>
              <div className="text-xs text-gray-500 mt-1">
                Auto-refreshes every minute<br/>
                Last: {lastRefresh.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </header>
       
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Portfolio Summary Card */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h2 className="text-lg font-semibold mb-3">Portfolio Summary</h2>
            <div className="flex gap-6 flex-wrap justify-start ">
            <div>
              <div className="text-sm text-gray-500">Total Invested</div>
              <div className="text-xl font-bold text-gray-800">{totalInvested.toFixed(2)} PKR</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Current Value</div>
              <div className="text-xl font-bold text-gray-800">{totalValue.toFixed(2)} PKR</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Unrealized P&L</div>
              <div className={`text-xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLoss.toFixed(2)} PKR
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">P&L %</div>
              <div className={`text-xl font-bold ${totalProfitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalProfitLossPercent >= 0 ? '+' : ''}{totalProfitLossPercent.toFixed(2)}%
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">Based on latest market prices (auto-refresh every minute)</div>
        </div>

            <HoldingsTable holdings={holdings} totalPortfolioValue={totalValue} onRefresh={loadData} />
            <PnLReport />
          </div>

          <div className="space-y-6">
            <AddBuyForm />

            <div className="bg-blue-50 rounded-lg shadow p-4">
              <h3 className="font-semibold mb-2">Auto-Refresh Active</h3>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• Market prices refresh automatically every minute</li>
                <li>• Click "Refresh Now" for immediate update</li>
                <li>• Unrealized P&L updates in real-time</li>
                <li>• All data stored in CSV files</li>
                <li>• Edit/Delete holdings from the table</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}