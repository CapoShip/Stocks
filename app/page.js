'use client';

import React, { useState, useEffect } from 'react';
import { 
  LineChart, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Search, Bell, User, 
  Activity, Plus, Trash2, RefreshCw, Briefcase, Globe
} from 'lucide-react';

const NEWS_FEED = [
  { id: 1, title: "Marchés : Le S&P 500 atteint un nouveau sommet", source: "Bloomberg", time: "1h" },
  { id: 2, title: "Tech : Les résultats trimestriels dépassent les attentes", source: "Reuters", time: "3h" },
  { id: 3, title: "Économie : L'inflation ralentit plus vite que prévu", source: "Financial Times", time: "5h" },
];

const TIME_RANGES = {
  '1J': { label: '1J', range: '1d', interval: '5m' },
  '5J': { label: '5J', range: '5d', interval: '15m' },
  '1M': { label: '1M', range: '1mo', interval: '1d' },
  '6M': { label: '6M', range: '6mo', interval: '1d' },
  '1A': { label: '1A', range: '1y', interval: '1wk' },
  '5A': { label: '5A', range: '5y', interval: '1mo' },
};

// Fonction pour formater les gros chiffres (Milliards/Trillions)
const formatNumber = (num) => {
  if (!num) return '---';
  const n = parseFloat(num);
  if (n >= 1.0e+12) return (n / 1.0e+12).toFixed(2) + "T";
  if (n >= 1.0e+9) return (n / 1.0e+9).toFixed(2) + "B";
  if (n >= 1.0e+6) return (n / 1.0e+6).toFixed(2) + "M";
  return n.toFixed(2);
};

// Fonction pour forcer le signe + ou -
const formatSignedNumber = (num) => {
    if (num === undefined || num === null) return '0.00';
    const n = parseFloat(num);
    // Si c'est positif, on ajoute le "+", sinon le "-" est déjà là
    return (n > 0 ? '+' : '') + n.toFixed(2);
};

export default function StockDashboard() {
  const [selectedStock, setSelectedStock] = useState('NVDA'); // Nvidia par défaut pour voir ton exemple
  const [activeRange, setActiveRange] = useState('1M');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartData, setChartData] = useState([]);
  const [watchlist, setWatchlist] = useState(['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const [stockInfo, setStockInfo] = useState({
    symbol: '---',
    name: '---',
    price: 0,
    change: 0,
    changePercent: 0,
    mktCap: '---',
    sector: '---',
    description: ''
  });

  const fetchStockData = async (symbol, rangeKey) => {
    setLoading(true);
    setErrorMsg(null);
    
    const { range, interval } = TIME_RANGES[rangeKey];

    try {
      const response = await fetch(`/api/stock?symbol=${symbol}&range=${range}&interval=${interval}`);
      const data = await response.json();

      if (!response.ok) throw new Error("Erreur lors de la récupération des données");

      setStockInfo({
        symbol: data.symbol,
        name: data.name,
        price: data.price,
        change: data.change,
        changePercent: data.changePercent, // On garde la valeur brute (ex: -1.81)
        mktCap: formatNumber(data.mktCap),
        sector: data.sector,
        description: data.description
      });

      const formattedChart = (data.chart || []).map(item => {
        const dateObj = new Date(item.date);
        let dateLabel = "";
        
        if (rangeKey === '1J' || rangeKey === '5J') {
            dateLabel = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (rangeKey === '5J') dateLabel = dateObj.toLocaleDateString([], { weekday: 'short' }) + ' ' + dateLabel;
        } else {
            dateLabel = dateObj.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
        }

        return {
          name: dateLabel,
          prix: item.prix
        };
      });

      setChartData(formattedChart);

    } catch (err) {
      console.error(err);
      setErrorMsg("Données indisponibles.");
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData(selectedStock, activeRange);
  }, [selectedStock, activeRange]);

  const isPositive = stockInfo.change >= 0;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSelectedStock(searchQuery.toUpperCase());
      setSearchQuery('');
    }
  };

  const addToWatchlist = () => {
    if (!watchlist.includes(selectedStock)) {
      setWatchlist([...watchlist, selectedStock]);
    }
  };

  const removeFromWatchlist = (symbol, e) => {
    e.stopPropagation();
    setWatchlist(watchlist.filter(s => s !== symbol));
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-20 md:w-64 bg-slate-950 border-r border-slate-800 flex-shrink-0 flex flex-col justify-between">
        <div>
          <div className="p-6 flex items-center gap-3 font-bold text-xl text-blue-400">
            <Activity className="w-8 h-8" />
            <span className="hidden md:block">AlphaTrade</span>
          </div>
          
          <div className="mt-8 px-4 hidden md:block">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Mes Favoris</h3>
            <div className="space-y-2">
              {watchlist.map(symbol => (
                  <div 
                    key={symbol} 
                    onClick={() => setSelectedStock(symbol)}
                    className={`p-3 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-600 transition-colors ${selectedStock === symbol ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">{symbol}</span>
                      <button onClick={(e) => removeFromWatchlist(symbol, e)} className="text-slate-500 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="h-16 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between px-6 backdrop-blur-sm">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher (ex: NVDA, AAPL)..." 
              className="bg-slate-900 border border-slate-700 text-sm rounded-full pl-10 pr-4 py-2 w-64 focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          <div className="flex items-center gap-4">
             <button onClick={() => fetchStockData(selectedStock, activeRange)} className="p-2 hover:bg-slate-800 rounded-full transition-colors" title="Rafraîchir">
                <RefreshCw size={18} className={loading ? "animate-spin text-blue-400" : "text-slate-400"} />
             </button>
             <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User size={16} />
             </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-900">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Top Stats Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                   {stockInfo.name} 
                  <span className="text-slate-500 text-lg font-normal">({stockInfo.symbol})</span>
                  <button onClick={addToWatchlist} className="text-slate-600 hover:text-yellow-400 transition-colors ml-2">
                    <Plus size={20} />
                  </button>
                </h1>
                
                {errorMsg ? (
                   <div className="mt-2 text-red-400 bg-red-400/10 px-3 py-2 rounded-lg text-sm border border-red-400/20 max-w-md">
                     ⚠️ {errorMsg}
                   </div>
                ) : (
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-4xl font-bold text-white">
                      ${stockInfo.price ? stockInfo.price.toFixed(2) : '0.00'}
                    </span>
                    <span className={`text-lg font-medium flex items-center ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? <TrendingUp size={20} className="mr-1" /> : <TrendingDown size={20} className="mr-1" />}
                      {/* Affichage corrigé du changement et pourcentage */}
                      {formatSignedNumber(stockInfo.change)} ({formatSignedNumber(stockInfo.changePercent)}%)
                    </span>
                  </div>
                )}
              </div>
              
              {/* Boutons d'intervalle */}
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                {Object.keys(TIME_RANGES).map((rangeKey) => (
                  <button
                    key={rangeKey}
                    onClick={() => setActiveRange(rangeKey)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                      activeRange === rangeKey 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {TIME_RANGES[rangeKey].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Chart Section */}
              <div className="lg:col-span-2 bg-slate-950 rounded-2xl p-6 border border-slate-800 shadow-xl min-h-[350px]">
                <h3 className="text-slate-400 text-sm mb-4">Évolution ({activeRange})</h3>
                <div className="h-80 w-full">
                  {loading ? (
                    <div className="h-full w-full flex items-center justify-center text-slate-500 animate-pulse">
                      Chargement des données...
                    </div>
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isPositive ? "#4ade80" : "#f87171"} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={isPositive ? "#4ade80" : "#f87171"} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} tickMargin={10} minTickGap={30} />
                        <YAxis 
                            domain={['auto', 'auto']} 
                            orientation="right" 
                            tick={{fill: '#64748b', fontSize: 12}} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(val) => val.toFixed(2)} 
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value) => [value.toFixed(2), "Prix"]} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="prix" 
                          stroke={isPositive ? "#4ade80" : "#f87171"} 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorPrice)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-slate-600 gap-2">
                      <BarChart2 size={32} />
                      <p>Données graphiques indisponibles</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Company Info */}
              <div className="flex flex-col gap-6">
                <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 shadow-xl">
                  <h2 className="text-lg font-semibold mb-4 text-slate-200 flex items-center gap-2">
                    <Briefcase size={18} className="text-blue-400"/> Info Entreprise
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-800">
                      <span className="text-slate-400 text-sm">Secteur</span>
                      <span className="font-medium text-right text-sm">{stockInfo.sector}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800">
                      <span className="text-slate-400 text-sm">Capitalisation</span>
                      <span className="font-medium text-right text-sm">{stockInfo.mktCap}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-slate-500 line-clamp-4 leading-relaxed">
                      {stockInfo.description}
                    </p>
                  </div>
                </div>

                {/* News */}
                 <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 shadow-xl flex-1">
                   <h2 className="text-lg font-semibold mb-4 text-slate-200 flex items-center gap-2">
                     <Globe size={18} className="text-blue-400"/> Actualités
                   </h2>
                   <div className="space-y-3">
                     {NEWS_FEED.map(news => (
                       <div key={news.id} className="text-sm border-l-2 border-slate-700 pl-3 py-1 hover:border-blue-500 transition-colors cursor-pointer">
                         <p className="text-slate-300 line-clamp-1">{news.title}</p>
                         <span className="text-xs text-slate-600">{news.time} • {news.source}</span>
                       </div>
                     ))}
                   </div>
                 </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}