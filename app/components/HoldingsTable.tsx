'use client';
import { useState } from 'react';
import { Holding } from '@/app/types';
import SellLotForm from './SellLotForm';

export default function HoldingsTable({ holdings, totalPortfolioValue, onRefresh }: { holdings: Holding[]; totalPortfolioValue: number; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!holdings || holdings.length === 0) return <div className="bg-white rounded shadow p-6 text-center text-gray-500">No holdings</div>;

  return (
    <div className="bg-white rounded shadow overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead className="bg-gray-50">
          <tr><th className="px-4 py-3 text-left">Company</th><th className="px-4 py-3 text-right">Shares</th><th className="px-4 py-3 text-right">Avg Cost</th><th className="px-4 py-3 text-right">Market Price</th><th className="px-4 py-3 text-right">Invested</th><th className="px-4 py-3 text-right">Current Value</th><th className="px-4 py-3 text-right">Unrealized P&L</th><th className="px-4 py-3 text-right">% of Portfolio</th><th className="px-4 py-3 text-center">Actions</th></tr>
        </thead>
        <tbody>
          {holdings.map(h => {
            const percent = totalPortfolioValue > 0 ? (h.currentValue / totalPortfolioValue) * 100 : 0;
            const isExpanded = expanded === h.symbol;
            return (
              <React.Fragment key={h.symbol}>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{h.symbol}<br/><span className="text-xs text-gray-500">{h.companyName}</span></td>
                  <td className="px-4 py-3 text-right">{h.totalShares}</td>
                  <td className="px-4 py-3 text-right">{h.averageCost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{h.currentPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{h.invested.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{h.currentValue.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${h.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>{h.pnl >= 0 ? '+' : ''}{h.pnl.toFixed(2)} ({h.pnlPercent.toFixed(2)}%)</td>
                  <td className="px-4 py-3 text-right">{percent.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-center"><button onClick={() => setExpanded(isExpanded ? null : h.symbol)} className="text-blue-600 text-sm">{isExpanded ? 'Hide Lots' : `Sell (${h.lots.length} lots)`}</button></td>
                </tr>
                {isExpanded && (
                  <tr><td colSpan={9} className="px-4 py-2 bg-gray-50"><div className="space-y-3">{h.lots.map(lot => <div key={lot.tradeId} className="border rounded p-3 bg-white"><SellLotForm lot={lot} onSuccess={onRefresh} /></div>)}</div></td></tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
import React from 'react';