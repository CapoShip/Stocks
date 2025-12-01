// components/compare/CompareTab.jsx
import React from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { formatNumber, formatSigned } from '@/lib/formatters';

export default function CompareTab({
  compareList,
  setCompareList,
  compareData,
  loadingCompare,
  fetchCompareData,
}) {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold">Comparateur</h2>
        <button
          onClick={fetchCompareData}
          className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
        >
          <RefreshCw size={20} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {compareList.map((s) => (
          <span
            key={s}
            className="bg-slate-800 px-3 py-1 rounded flex items-center gap-2 text-sm"
          >
            {s}
            <Trash2
              size={12}
              onClick={() =>
                setCompareList((prev) => prev.filter((x) => x !== s))
              }
              className="cursor-pointer hover:text-red-400"
            />
          </span>
        ))}
      </div>
      {loadingCompare ? (
        <div className="text-center text-slate-500">Chargement...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full bg-slate-900 text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 uppercase text-xs">
              <tr>
                <th className="p-4">Symbole</th>
                <th className="p-4 text-right">Prix</th>
                <th className="p-4 text-right">Var.</th>
                <th className="p-4 text-right">Cap.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {compareData.map((d) => (
                <tr key={d.symbol}>
                  <td className="p-4 font-bold text-blue-400">{d.symbol}</td>
                  <td className="p-4 text-right">
                    ${d.price?.toFixed(2)}
                  </td>
                  <td
                    className={`p-4 text-right ${
                      d.change >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {formatSigned(d.changePercent)}%
                  </td>
                  <td className="p-4 text-right">
                    {formatNumber(d.mktCap)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
