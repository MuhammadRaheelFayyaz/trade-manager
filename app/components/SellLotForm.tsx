'use client';

import { useState } from 'react';
import { addSellTrade } from '@/app/actions';
import { BuyLot } from '@/app/types';

interface SellLotFormProps {
  lot: BuyLot;
  symbol: string;
  companyName: string;
  onSuccess: () => void;
}

export default function SellLotForm({ lot, symbol, companyName, onSuccess }: SellLotFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [quantity, setQuantity] = useState(lot.remainingQty);
  
  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      await addSellTrade(formData);
      onSuccess();
    } catch (error: any) {
      alert(error.message || 'Error selling');
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <form action={handleSubmit} className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
      <input type="hidden" name="buyTradeId" value={lot.tradeId} />
      <div className="text-sm text-gray-600">
        Buy Price: {lot.buyPrice} | Available: {lot.remainingQty}
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Quantity to Sell</label>
        <input
          type="number"
          name="quantity"
          step="1"
          max={lot.remainingQty}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          required
          className="w-full border rounded px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Sell Price (PKR)</label>
        <input type="number" name="price" step="0.01" required className="w-full border rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Date</label>
        <input type="date" name="date" required className="w-full border rounded px-2 py-1 text-sm" />
      </div>
      <button type="submit" disabled={isLoading} className="w-full bg-red-600 text-white py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50">
        {isLoading ? 'Processing...' : 'Sell from this Lot'}
      </button>
    </form>
  );
}