// components/dashboard/DashboardTab.jsx
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Briefcase,
  Globe,
  Star,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { formatNumber, formatSigned, timeAgo } from '@/lib/formatters';

export default function DashboardTab({
  stockInfo,
  watchlist,
  toggleWatchlist,
  activeRange,
  setActiveRange,
  TIME_RANGES,
  rangeHigh,
  rangeLow,
  volumeTotal,
  chartData,
  loading,
  news,
  visibleNewsCount,
  setVisibleNewsCount,
  showFullDescription,
  setShowFullDescription,
}) {
  const formatXAxis = (timestamp) => {
    const date = new Date(timestamp);
    if (activeRange === '1J') {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (activeRange === '1S' || activeRange === '5J') {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* Header + KPI */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            {stockInfo.name}
            <span className="text-xl text-slate-500">({stockInfo.symbol})</span>
            <button
              onClick={() => toggleWatchlist(stockInfo.symbol)}
              className={`transition-all hover:scale-110 ${
                watchlist.includes(stockInfo.symbol)
                  ? 'text-yellow-400'
                  : 'text-slate-600 hover:text-yellow-400'
              }`}
            >
              <Star
                fill={
                  watchlist.includes(stockInfo.symbol) ? 'currentColor' : 'none'
                }
              />
            </button>
          </h1>
          <div className="flex flex-wrap items-baseline gap-3 mt-1">
            <span className="text-4xl font-bold tracking-tight">
              ${stockInfo.price?.toFixed(2)}
            </span>
            <span
              className={`text-lg font-medium flex items-center px-2 py-0.5 rounded-lg ${
                stockInfo.change >= 0
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              {stockInfo.change >= 0 ? (
                <TrendingUp size={18} className="mr-1" />
              ) : (
                <TrendingDown size={18} className="mr-1" />
              )}
              {formatSigned(stockInfo.change)} ({formatSigned(stockInfo.changePercent)}%)
            </span>
            <span className="text-xs text-slate-500">Sur {activeRange}</span>
          </div>
        </div>

        {/* Time ranges + stats période */}
        <div className="flex flex-col gap-2 items-end">
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
            {Object.keys(TIME_RANGES).map((r) => (
              <button
                key={r}
                onClick={() => setActiveRange(r)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  activeRange === r
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex gap-3 text-xs text-slate-400">
            <div className="px-3 py-2 bg-slate-900 rounded-lg border border-slate-800">
              <div className="uppercase text-[10px] text-slate-500">
                Plus haut période
              </div>
              <div className="font-mono text-sm">
                {rangeHigh != null ? '$' + rangeHigh.toFixed(2) : '--'}
              </div>
            </div>
            <div className="px-3 py-2 bg-slate-900 rounded-lg border border-slate-800">
              <div className="uppercase text-[10px] text-slate-500">
                Plus bas période
              </div>
              <div className="font-mono text-sm">
                {rangeLow != null ? '$' + rangeLow.toFixed(2) : '--'}
              </div>
            </div>
            <div className="px-3 py-2 bg-slate-900 rounded-lg border border-slate-800">
              <div className="uppercase text-[10px] text-slate-500">
                Volume total
              </div>
              <div className="font-mono text-sm">
                {volumeTotal != null ? formatNumber(volumeTotal) : '--'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-slate-900 rounded-2xl p-1 border border-slate-800 shadow-xl min-h-[400px]">
        {loading ? (
          <div className="h-[400px] flex items-center justify-center text-slate-500 animate-pulse">
            Chargement des données...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={chartData}
              margin={{
                top: 20,
                right: 20,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={stockInfo.change >= 0 ? '#4ade80' : '#f87171'}
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor={stockInfo.change >= 0 ? '#4ade80' : '#f87171'}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
                vertical={false}
                opacity={0.4}
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                tick={{
                  fill: '#64748b',
                  fontSize: 11,
                }}
                minTickGap={60}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                orientation="right"
                domain={['auto', 'auto']}
                tick={{
                  fill: '#64748b',
                  fontSize: 11,
                }}
                tickFormatter={(v) => v.toFixed(2)}
                axisLine={false}
                tickLine={false}
                dx={10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  color: '#fff',
                  borderRadius: '8px',
                }}
                itemStyle={{
                  color: stockInfo.change >= 0 ? '#4ade80' : '#f87171',
                }}
                labelFormatter={(ts) => new Date(ts).toLocaleString()}
                formatter={(v) => [v.toFixed(2), 'Prix']}
                cursor={{
                  stroke: '#64748b',
                  strokeWidth: 1,
                  strokeDasharray: '4 4',
                }}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="prix"
                stroke={stockInfo.change >= 0 ? '#4ade80' : '#f87171'}
                strokeWidth={2}
                fill="url(#colorPrice)"
                isAnimationActive
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Fundamentals + News */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fundamentals */}
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 h-fit">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Briefcase size={18} className="text-blue-400" />
            Fondamentaux
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Cap. Boursière</span>
              <span className="font-mono">{formatNumber(stockInfo.mktCap)}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">P/E Ratio</span>
              <span className="font-mono">
                {stockInfo.peRatio?.toFixed(2) || '-'}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Prix Cible (1A)</span>
              <span className="text-green-400 font-mono">
                {stockInfo.targetPrice ? '$' + stockInfo.targetPrice : '-'}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Recommandation</span>
              <span className="uppercase font-bold text-yellow-400 text-xs bg-yellow-400/10 px-2 py-1 rounded">
                {stockInfo.recommendation?.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Secteur</span>
              <span className="text-right truncate w-32 text-slate-200">
                {stockInfo.sector}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
              À propos
            </h4>
            <div className="text-xs text-slate-400 leading-relaxed text-justify relative">
              <p className={!showFullDescription ? 'line-clamp-4' : ''}>
                {stockInfo.description}
              </p>
              <button
                onClick={() => setShowFullDescription((v) => !v)}
                className="text-blue-400 hover:text-blue-300 mt-2 flex items-center gap-1 font-bold text-xs"
              >
                {showFullDescription ? 'Réduire' : 'Lire la suite'}
              </button>
            </div>
          </div>
        </div>

        {/* News */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 border border-slate-800 flex flex-col">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Globe size={18} className="text-blue-400" />
            Actualités en direct
          </h3>

          <div className="space-y-3 flex-1">
            {news.length > 0 ? (
              <>
                {news.slice(0, visibleNewsCount).map((n) => (
                  <a
                    key={n.uuid}
                    href={n.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-slate-800 hover:border-blue-500 hover:bg-slate-800/50 transition-all group"
                  >
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                          {n.publisher}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          {timeAgo(n.providerPublishTime)}
                          <ExternalLink size={10} />
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-slate-200 group-hover:text-blue-300 transition-colors leading-snug">
                        {n.title}
                      </h4>
                    </div>
                  </a>
                ))}

                {news.length > 4 && (
                  <button
                    onClick={() =>
                      setVisibleNewsCount((prev) => (prev > 4 ? 4 : prev + 4))
                    }
                    className="w-full py-3 mt-4 flex items-center justify-center gap-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors"
                  >
                    {visibleNewsCount > 4 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {visibleNewsCount > 4 ? 'Voir moins' : "Charger plus d'actualités"}
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-10 text-slate-500 bg-slate-950 rounded-xl border border-slate-800 border-dashed">
                Aucune actualité récente trouvée pour ce titre.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
