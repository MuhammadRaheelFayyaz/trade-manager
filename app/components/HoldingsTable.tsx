'use client';

import { useState } from 'react';
import { Holding } from '@/app/types';
import SellLotForm from './SellLotForm';
import { updateBuyTrade, deleteBuyTrade } from '@/app/actions';

interface HoldingsTableProps {
  holdings: Holding[];
  totalPortfolioValue: number;
  onRefresh: () => void;
}

export default function HoldingsTable({ holdings, totalPortfolioValue, onRefresh }: HoldingsTableProps) {
  const [expandedLots, setExpandedLots] = useState<string | null>(null);
  const [editingTrade, setEditingTrade] = useState<{
    tradeId: string;
    symbol: string;
    quantity: number;
    price: number;
    date: string;
  } | null>(null);

  async function handleEditSubmit(formData: FormData) {
    try {
      await updateBuyTrade(formData);
      setEditingTrade(null);
      onRefresh();
    } catch (error: any) {
      alert(error.message || 'Error updating trade');
    }
  }

  async function handleDelete(tradeId: string, symbol: string) {
    if (confirm(`Delete all trades for ${symbol}? This will also remove all sell trades associated.`)) {
      try {
        await deleteBuyTrade(tradeId);
        onRefresh();
      } catch (error: any) {
        alert(error.message || 'Error deleting trade');
      }
    }
  }

  if (holdings.length === 0) {
    return <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">No holdings yet. Add buy trades.</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full min-w-[1000px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">Company</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Shares</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Avg Cost</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Market Price</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Invested (PKR)</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Current Value</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Unrealized P&L</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">% of Portfolio</th>
            <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {holdings.map((holding) => {
            const percentage = totalPortfolioValue > 0 ? (holding.currentValue / totalPortfolioValue) * 100 : 0;
            const isExpanded = expandedLots === holding.symbol;
            // For simplicity, edit/delete apply to the first buy trade of the holding (since holdings may have multiple lots)
            const primaryTrade = holding.originalBuyTrades?.[0];
            return (
              <React.Fragment key={holding.symbol}>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">
                    {holding.symbol}<br/><span className="text-xs text-gray-500">{holding.companyName}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">{holding.totalShares}</td>
                  <td className="px-4 py-3 text-right text-sm">{holding.averageCost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-sm font-mono">{holding.currentPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-sm">{holding.invested.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-sm">{holding.currentValue.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right text-sm font-medium ${holding.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {holding.pnl >= 0 ? '+' : ''}{holding.pnl.toFixed(2)} ({holding.pnlPercent.toFixed(2)}%)
                   </td>
                  <td className="px-4 py-3 text-right text-sm">{percentage.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {primaryTrade && (
                      <>
                        <button
                          onClick={() => setEditingTrade({
                            tradeId: primaryTrade.id,
                            symbol: holding.symbol,
                            quantity: primaryTrade.quantity,
                            price: primaryTrade.price,
                            date: primaryTrade.date.split('T')[0],
                          })}
                          className="text-blue-600 hover:text-blue-800 text-sm mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(primaryTrade.id, holding.symbol)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setExpandedLots(isExpanded ? null : holding.symbol)}
                      className="text-green-600 hover:text-green-800 text-sm ml-2"
                    >
                      {isExpanded ? 'Hide Lots' : 'Sell Lots'}
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={9} className="px-4 py-2 bg-gray-50">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700">Individual Lots:</p>
                        {holding.lots.map((lot) => (
                          <div key={lot.tradeId} className="border rounded-lg p-3 bg-white">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm">Buy Date: {new Date(lot.date).toLocaleDateString()}</p>
                                <p className="text-sm">Buy Price: {lot.buyPrice} | Shares: {lot.remainingQty}</p>
                              </div>
                            </div>
                            <SellLotForm lot={lot} symbol={holding.symbol} companyName={holding.companyName} onSuccess={onRefresh} />
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Edit Modal */}
      {editingTrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Buy Trade - {editingTrade.symbol}</h3>
            <form action={handleEditSubmit}>
              <input type="hidden" name="tradeId" value={editingTrade.tradeId} />
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    defaultValue={editingTrade.quantity}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Price (PKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    required
                    defaultValue={editingTrade.price}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Date</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={editingTrade.date}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTrade(null)}
                    className="flex-1 bg-gray-300 text-gray-800 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';