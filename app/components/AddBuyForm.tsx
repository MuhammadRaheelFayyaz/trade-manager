'use client';
import { useState } from 'react';

export default function AddBuyForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      symbol: formData.get('symbol'),
      companyName: formData.get('companyName'),
      quantity: formData.get('quantity'),
      price: formData.get('price'),
      date: formData.get('date'),
    };
    try {
      const res = await fetch('/api/trades/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      onSuccess();
      e.currentTarget.reset();
    } catch (err) {
      alert('Error adding buy trade');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Add Buy Trade</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium">Symbol</label><input name="symbol" required className="w-full border rounded px-3 py-2" placeholder="MARI" /></div>
        <div><label className="block text-sm font-medium">Company Name</label><input name="companyName" required className="w-full border rounded px-3 py-2" placeholder="Mari Petroleum" /></div>
        <div><label className="block text-sm font-medium">Quantity</label><input name="quantity" type="number" step="1" required className="w-full border rounded px-3 py-2" /></div>
        <div><label className="block text-sm font-medium">Price (PKR)</label><input name="price" type="number" step="0.01" required className="w-full border rounded px-3 py-2" /></div>
        <div><label className="block text-sm font-medium">Date</label><input name="date" type="date" required className="w-full border rounded px-3 py-2" /></div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">{loading ? 'Adding...' : 'Add Buy'}</button>
      </form>
    </div>
  );
}