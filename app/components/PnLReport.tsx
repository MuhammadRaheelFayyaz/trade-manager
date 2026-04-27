'use client';

import { useState } from 'react';
import { getPnLForDateRange } from '@/app/actions';
import { startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';

export default function PnLReport() {
  const [pnl, setPnl] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedRange, setSelectedRange] = useState('custom');

  async function fetchPnL(start: string, end: string) {
    setLoading(true);
    try {
      const result = await getPnLForDateRange(start, end);
      setPnl(result);
    } catch (error) {
      alert('Error fetching P&L');
    } finally {
      setLoading(false);
    }
  }

  function handleRangeChange(range: string) {
    setSelectedRange(range);
    const today = new Date();
    let start = today;
    let end = today;
    
    switch(range) {
      case 'daily':
        start = today;
        end = today;
        break;
      case 'weekly':
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = today;
        break;
      case 'monthly':
        start = startOfMonth(today);
        end = today;
        break;
      case 'yearly':
        start = startOfYear(today);
        end = today;
        break;
      default:
        return;
    }
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    setStartDate(startStr);
    setEndDate(endStr);
    fetchPnL(startStr, endStr);
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchPnL(startDate, endDate);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Profit & Loss Report</h2>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {['daily', 'weekly', 'monthly', 'yearly'].map((range) => (
          <button
            key={range}
            onClick={() => handleRangeChange(range)}
            className={`px-3 py-1 rounded capitalize ${selectedRange === range ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {range}
          </button>
        ))}
      </div>
      
      <form onSubmit={handleCustomSubmit} className="space-y-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Custom Range
            </button>
          </div>
        </div>
      </form>
      
      {loading && <div className="text-center py-4">Loading...</div>}
      
      {!loading && pnl !== null && (
        <div className={`text-center p-4 rounded-lg ${pnl >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
          <p className="text-sm text-gray-600">Realized Profit/Loss</p>
          <p className={`text-2xl font-bold ${pnl >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} PKR
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
          </p>
        </div>
      )}
      
      {!loading && pnl === null && (
        <div className="text-center text-gray-500 py-4">Select a date range to see realized P&L</div>
      )}
    </div>
  );
}