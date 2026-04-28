'use client';

import { useEffect, useState, useRef } from 'react';
import { getDashboardData } from './actions';
import HoldingsTable from './components/HoldingsTable';
import AddBuyForm from './components/AddBuyForm';
import PnLReport from './components/PnLReport';
import { Holding } from '@/app/types';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Karachi';
const TRADING_START = 9.5; // 9:30 AM = 9.5 hours
const TRADING_END = 16.5;   // 4:30 PM = 16.5 hours

export default function Home() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getDashboardData();
      setHoldings(data.holdings);
      setTotalValue(data.totalPortfolioValue);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshPrices() {
    if (refreshingPrices) return;
    setRefreshingPrices(true);
    try {
      const response = await fetch('/api/refresh-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (result.success) {
        await loadData();
        setLastRefresh(new Date());
      } else {
        console.warn('Refresh failed:', result.message);
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshingPrices(false);
    }
  }

  // Check if current time is within trading hours (PKT time, weekdays only)
  function isTradingTime(): boolean {
    const nowPKT = toZonedTime(new Date(), TIMEZONE);
    const day = nowPKT.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = nowPKT.getHours();
    const minute = nowPKT.getMinutes();
    const currentHourDecimal = hour + minute / 60;
    
    // Monday to Friday (1-5) and between 9:30 and 16:30
    return day >= 1 && day <= 5 && currentHourDecimal >= TRADING_START && currentHourDecimal < TRADING_END;
  }

  // Schedule next refresh at the next minute boundary (e.g., 00 seconds)
  function scheduleNextRefresh() {
    if (!autoRefresh) {
      setNextRefresh(null);
      return;
    }

    const now = new Date();
    const nextMinute = new Date(now);
    nextMinute.setSeconds(0, 0);
    nextMinute.setMinutes(nextMinute.getMinutes() + 1);
    
    // If next minute is after trading hours, schedule at next trading day start
    let targetTime = nextMinute;
    const targetPKT = toZonedTime(targetTime, TIMEZONE);
    let hourDecimal = targetPKT.getHours() + targetPKT.getMinutes() / 60;
    let isWeekend = targetPKT.getDay() === 0 || targetPKT.getDay() === 6;
    
    if (hourDecimal >= TRADING_END || isWeekend || hourDecimal < TRADING_START) {
      // Find next trading day 9:30 AM PKT
      const nextTradingStart = new Date(targetTime);
      nextTradingStart.setUTCHours(0, 0, 0, 0);
      // Convert to PKT date by adding 5 hours UTC offset
      // We'll use a simpler approach: increment day until we find a weekday
      let daysToAdd = 1;
      let found = false;
      while (!found) {
        const checkDate = new Date(targetTime);
        checkDate.setUTCDate(checkDate.getUTCDate() + daysToAdd);
        const checkPKT = toZonedTime(checkDate, TIMEZONE);
        const hourDec = 9.5; // Start time
        if (checkPKT.getDay() >= 1 && checkPKT.getDay() <= 5) {
          // Set to 9:30 AM PKT that day
          const startTime = new Date(checkDate);
          startTime.setUTCHours(4, 30, 0, 0); // 9:30 PKT = 4:30 UTC
          targetTime = startTime;
          found = true;
          break;
        }
        daysToAdd++;
      }
    }
    
    const delay = targetTime.getTime() - Date.now();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (autoRefresh && isTradingTime()) {
        handleRefreshPrices().finally(() => {
          scheduleNextRefresh();
        });
      } else if (autoRefresh) {
        // Not trading time, schedule next check at trading start tomorrow
        scheduleNextRefresh();
      }
    }, Math.max(0, delay));
    
    setNextRefresh(targetTime);
  }

  // Start/stop auto-refresh based on toggle and trading hours
  useEffect(() => {
    if (autoRefresh) {
      // Immediate first check if within trading hours
      if (isTradingTime()) {
        handleRefreshPrices().finally(() => scheduleNextRefresh());
      } else {
        scheduleNextRefresh();
      }
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setNextRefresh(null);
    }
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh]);

  // Initial data load
  useEffect(() => {
    loadData();
  }, []);

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
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow">
                <span className="text-sm font-medium">Auto Refresh</span>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${autoRefresh ? 'bg-green-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoRefresh ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <button
                onClick={handleRefreshPrices}
                disabled={refreshingPrices}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {refreshingPrices ? 'Fetching...' : 'Refresh Now'}
              </button>
            </div>
          </div>
          {autoRefresh && nextRefresh && (
            <div className="mt-2 text-sm text-gray-500">
              Last refresh: {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never'} | 
              Next auto-refresh: {nextRefresh.toLocaleTimeString()}
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Portfolio Summary</h2>
                <button onClick={loadData} className="text-blue-600 text-sm">Refresh Holdings</button>
              </div>
              <div className="mt-2 text-2xl font-bold">{totalValue.toFixed(2)} PKR</div>
              <div className="text-sm text-gray-500">Total Portfolio Value (based on latest market prices)</div>
            </div>

            <HoldingsTable holdings={holdings} totalPortfolioValue={totalValue} onRefresh={loadData} />
            <PnLReport />
          </div>

          <div className="space-y-6">
            <AddBuyForm />

            <div className="bg-blue-50 rounded-lg shadow p-4">
              <h3 className="font-semibold mb-2">Auto-Refresh Settings</h3>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• Auto-refresh every minute during PSX trading hours (9:30 AM - 4:30 PM PKT)</li>
                <li>• Only on weekdays (Monday to Friday)</li>
                <li>• Toggle ON/OFF with the switch above</li>
                <li>• Manual refresh also available</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}