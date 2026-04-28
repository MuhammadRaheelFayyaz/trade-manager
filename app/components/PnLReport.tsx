'use client';
import { useState } from 'react';
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
      const res = await fetch(`/api/pnl?startDate=${start}&endDate=${end}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPnl(data.pnl);
    } catch (err) {
      console.error(err);
      alert('Error fetching P&L');
      setPnl(null);
    } finally {
      setLoading(false);
    }
  }

  function handleRangeSelect(range: string) {
    setSelectedRange(range);
    const today = new Date();
    let start = today;
    const end = today;
    if (range === 'daily') start = today;
    else if (range === 'weekly') start = startOfWeek(today, { weekStartsOn: 1 });
    else if (range === 'monthly') start = startOfMonth(today);
    else if (range === 'yearly') start = startOfYear(today);
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    setStartDate(startStr);
    setEndDate(endStr);
    fetchPnL(startStr, endStr);
  }

  function handleCustom(e: React.FormEvent) {
    e.preventDefault();
    setSelectedRange('custom');
    fetchPnL(startDate, endDate);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Realized Profit & Loss</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {['daily', 'weekly', 'monthly', 'yearly'].map((range) => (
          <button
            key={range}
            onClick={() => handleRangeSelect(range)}
            className={`px-3 py-1 rounded capitalize ${selectedRange === range ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {range}
          </button>
        ))}
      </div>
      <form onSubmit={handleCustom} className="flex flex-wrap gap-2 mb-4">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">
          Custom Range
        </button>
      </form>
      {loading && <div className="text-center py-4">Loading...</div>}
      {!loading && pnl !== null && (
        <div className={`text-center p-4 rounded-lg ${pnl >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
          <p className="text-sm text-gray-600 mb-1">
            Realized P&L from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
          </p>
          <p className={`text-2xl font-bold ${pnl >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} PKR
          </p>
        </div>
      )}
      {!loading && pnl === null && (
        <div className="text-center text-gray-500 py-4">Select a range to see realized P&L</div>
      )}
    </div>
  );
}