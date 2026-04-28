'use client';

import { useState } from 'react';
import { addBuyTrade } from '@/app/actions';

export default function AddBuyForm() {
  const [isLoading, setIsLoading] = useState(false);
  
  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      await addBuyTrade(formData);
      (document.getElementById('buyForm') as HTMLFormElement).reset();
    } catch (error) {
      alert('Error adding buy trade');
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6 fixed">
      <h2 className="text-xl font-semibold mb-4">Add Buy Trade</h2>
      <form id="buyForm" action={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Symbol</label>
          <input name="symbol" required className="w-full border rounded-lg px-3 py-2" placeholder="MARI" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Company Name</label>
          <input name="companyName" required className="w-full border rounded-lg px-3 py-2" placeholder="Mari Petroleum" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Quantity</label>
          <input name="quantity" type="number" step="1" required className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Price (PKR)</label>
          <input name="price" type="number" step="0.01" required className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input name="date" type="date" required className="w-full border rounded-lg px-3 py-2" />
        </div>
        <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {isLoading ? 'Adding...' : 'Add Buy Trade'}
        </button>
      </form>
    </div>
  );
}