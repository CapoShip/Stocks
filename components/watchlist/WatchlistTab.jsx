// components/watchlist/WatchlistTab.jsx
import React from 'react';
import { Star, RefreshCw, Trash2 } from 'lucide-react';
import { formatSigned } from '@/lib/formatters';

export default function WatchlistTab({
  watchlistData,
  loadingWatchlist,
  onRefresh,
  setSelectedStock,
  setActiveTab,
  toggleWatchlist,
}) {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Star className="text-yellow-400" fill="currentColor" />
          Ma Liste de Surveillance
        </h2>
        <button
          onClick={onRefresh}
          className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
        >
          <RefreshCw size={20} />
        </button>
      </div>
      {loadingWatchlist ? (
        <div className="text-center py-20 text-slate-500 animate-pulse">
          Chargement...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {watchlistData.map((data) => (
            <div
              key={data.symbol}
              onClick={() => {
                setSelectedStock(data.symbol);
                setActiveTab('dashboard');
              }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden cursor-pointer hover:border-blue-500 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold">{data.symbol}</h3>
                  <div className="text-sm text-slate-400 truncate w-48">
                    {data.name}
                  </div>
                </div>
                <div
                  className={`text-right ${
                    data.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  <div className="text-2xl font-bold">
                    ${data.price?.toFixed(2)}
                  </div>
                  <div className="text-sm">
                    {formatSigned(data.changePercent)}%
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWatchlist(data.symbol);
                }}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 p-2"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
