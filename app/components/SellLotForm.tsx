'use client';
import { useState } from 'react';
import { BuyLot } from '@/app/types';

export default function SellLotForm({ lot, onSuccess }: { lot: BuyLot; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(lot.remainingqty);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      buyTradeId: lot.tradeId,
      quantity: formData.get('quantity'),
      price: formData.get('price'),
      date: formData.get('date'),
    };
    try {
      const res = await fetch('/api/trades/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      onSuccess();
    } catch (err) {
      alert('Error selling');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
      <div className="text-sm text-gray-600">Buy Price: {lot.buyPrice} | Available: {lot.remainingqty}</div>
      <div><label className="block text-xs font-medium">Quantity</label><input type="number" name="quantity" step="1" max={lot.remainingqty} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required className="w-full border rounded px-2 py-1 text-sm" /></div>
      <div><label className="block text-xs font-medium">Sell Price</label><input type="number" name="price" step="0.01" required className="w-full border rounded px-2 py-1 text-sm" /></div>
      <div><label className="block text-xs font-medium">Date</label><input type="date" name="date" required className="w-full border rounded px-2 py-1 text-sm" /></div>
      <button type="submit" disabled={loading} className="w-full bg-red-600 text-white py-1 rounded text-sm">{loading ? 'Processing...' : 'Sell from Lot'}</button>
    </form>
  );
}