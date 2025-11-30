'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
// AJOUT DE 'Activity' DANS LES IMPORTS CI-DESSOUS
import { 
  Activity, TrendingUp, TrendingDown, Search, Plus, Trash2, RefreshCw, Briefcase, Globe, BarChart2, Layers, GitCompare, ExternalLink
} from 'lucide-react';

// --- CONFIGURATION ---
const TIME_RANGES = {
  '1J': { label: '1J', range: '1d', interval: '5m' },
  '5J': { label: '5J', range: '5d', interval: '15m' },
  '1M': { label: '1M', range: '1mo', interval: '1d' },
  '6M': { label: '6M', range: '6mo', interval: '1d' },
  '1A': { label: '1A', range: '1y', interval: '1wk' },
};

// Données statiques pour la page "Secteurs"
const MARKET_SECTORS = {
  'Technologie': ['AAPL', 'MSFT', 'NVDA', 'AMD', 'GOOGL', 'META'],
  'Finance': ['JPM', 'BAC', 'V', 'MA', 'GS'],
  'Automobile': ['TSLA', 'F', 'GM', 'TM', 'RACE'],
  'Santé': ['JNJ', 'PFE', 'LLY', 'MRK', 'ABBV'],
  'Crypto': ['BTC-USD', 'ETH-USD', 'SOL-USD', 'DOGE-USD', 'COIN']
};

const formatNumber = (num) => {
  if (!num) return '-';
  const n = parseFloat(num);
  if (n >= 1.0e+12) return (n / 1.0e+12).toFixed(2) + "T";
  if (n >= 1.0e+9) return (n / 1.0e+9).toFixed(2) + "B";
  if (n >= 1.0e+6) return (n / 1.0e+6).toFixed(2) + "M";
  return n.toFixed(2);
};

const formatSigned = (num) => {
    if (num === undefined || num === null) return '0.00';
    return (num > 0 ? '+' : '') + num.toFixed(2);
};

export default function StockApp() {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, sectors, compare
  const [selectedStock, setSelectedStock] = useState('NVDA'); 
  const [watchlist, setWatchlist] = useState(['AAPL', 'NVDA', 'TSLA', 'AMZN']);
  
  // --- ÉTATS DASHBOARD ---
  const [activeRange, setActiveRange] = useState('1M');
  const [stockInfo, setStockInfo] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- ÉTATS RECHERCHE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef(null);

  // --- ÉTATS COMPARATEUR ---
  const [compareList, setCompareList] = useState(['AAPL', 'MSFT']);
  const [compareData, setCompareData] = useState([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // 1. CHARGEMENT DASHBOARD
  const fetchStockData = async (symbol, rangeKey) => {
    setLoading(true);
    const { range, interval } = TIME_RANGES[rangeKey];
    try {
      const res = await fetch(`/api/stock?symbol=${symbol}&range=${range}&interval=${interval}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStockInfo(data);
      setNews(data.news || []); 
      
      const formattedChart = (data.chart || []).map(item => {
        const d = new Date(item.date);
        let label = (rangeKey === '1J' || rangeKey === '5J') 
          ? d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
          : d.toLocaleDateString([], {day:'2-digit', month:'2-digit'});
        return { name: label, prix: item.prix };
      });
      setChartData(formattedChart);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') fetchStockData(selectedStock, activeRange);
  }, [selectedStock, activeRange, activeTab]);

  // 2. GESTION RECHERCHE AVEC SUGGESTIONS
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.length < 2) {
        setSuggestions([]);
        return;
    }

    searchTimeout.current = setTimeout(async () => {
        const res = await fetch(`/api/search?q=${val}`);
        const data = await res.json();
        setSuggestions(data.results || []);
        setShowSuggestions(true);
    }, 400);
  };

  const selectSuggestion = (symbol) => {
    if (activeTab === 'compare') {
        if (!compareList.includes(symbol)) setCompareList([...compareList, symbol]);
    } else {
        setSelectedStock(symbol);
        setActiveTab('dashboard');
    }
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // 3. CHARGEMENT COMPARATEUR
  const fetchCompareData = async () => {
    setLoadingCompare(true);
    const newData = [];
    for (const sym of compareList) {
        try {
            const res = await fetch(`/api/stock?symbol=${sym}&range=1d&interval=15m`); 
            const data = await res.json();
            if (res.ok) newData.push(data);
        } catch (e) { console.error(e); }
    }
    setCompareData(newData);
    setLoadingCompare(false);
  };

  useEffect(() => {
    if (activeTab === 'compare') fetchCompareData();
  }, [activeTab, compareList]);


  // --- RENDER ---
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Sidebar Navigation */}
      <div className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 text-xl font-bold text-blue-400 flex items-center gap-2">
            <Activity /> <span className="hidden md:block">AlphaTrade</span>
        </div>
        
        <nav className="flex-1 px-2 space-y-2 mt-4">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${activeTab==='dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <BarChart2 size={20} /> <span className="hidden md:block">Dashboard</span>
            </button>
            <button onClick={() => setActiveTab('sectors')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${activeTab==='sectors' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <Layers size={20} /> <span className="hidden md:block">Marché</span>
            </button>
            <button onClick={() => setActiveTab('compare')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${activeTab==='compare' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <GitCompare size={20} /> <span className="hidden md:block">Comparateur</span>
            </button>
        </nav>

        {/* Watchlist Sidebar (Visible seulement en Dashboard) */}
        {activeTab === 'dashboard' && (
            <div className="p-4 hidden md:block border-t border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Watchlist</h3>
                <div className="space-y-1">
                    {watchlist.map(sym => (
                        <div key={sym} onClick={() => setSelectedStock(sym)} className={`flex justify-between p-2 rounded cursor-pointer ${selectedStock===sym ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900'}`}>
                            <span>{sym}</span>
                            <Trash2 size={14} onClick={(e)=>{e.stopPropagation(); setWatchlist(watchlist.filter(s=>s!==sym))}} className="hover:text-red-400"/>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Top Bar avec Recherche Intelligente */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur z-20">
            <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                    type="text" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder={activeTab === 'compare' ? "Ajouter au comparateur..." : "Rechercher une action..."}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {/* Dropdown Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-12 left-0 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                        {suggestions.map((s) => (
                            <div key={s.symbol} onClick={() => selectSuggestion(s.symbol)} className="p-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0">
                                <div className="flex justify-between">
                                    <span className="font-bold text-white">{s.symbol}</span>
                                    <span className="text-xs text-slate-500">{s.exchange}</span>
                                </div>
                                <div className="text-xs text-slate-400 truncate">{s.name}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* Bouton Profil simulé (User) */}
            <div className="flex gap-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer">U</div>
            </div>
        </header>

        {/* Content Scrollable */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
            
            {/* VUE DASHBOARD */}
            {activeTab === 'dashboard' && stockInfo && (
                <div className="space-y-6 max-w-7xl mx-auto">
                    {/* Header Stock */}
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                                {stockInfo.name} <span className="text-xl text-slate-500">({stockInfo.symbol})</span>
                                <button onClick={() => !watchlist.includes(stockInfo.symbol) && setWatchlist([...watchlist, stockInfo.symbol])} className="text-slate-600 hover:text-yellow-400"><Plus/></button>
                            </h1>
                            <div className="flex items-baseline gap-3 mt-1">
                                <span className="text-4xl font-bold">${stockInfo.price?.toFixed(2)}</span>
                                <span className={`text-lg font-medium flex items-center ${stockInfo.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatSigned(stockInfo.change)} ({formatSigned(stockInfo.changePercent)}%)
                                    <span className="text-xs text-slate-500 ml-2 bg-slate-900 px-2 py-1 rounded">Sur {activeRange}</span>
                                </span>
                            </div>
                        </div>
                        <div className="flex bg-slate-900 p-1 rounded-lg">
                            {Object.keys(TIME_RANGES).map(r => (
                                <button key={r} onClick={() => setActiveRange(r)} className={`px-3 py-1 text-xs font-bold rounded ${activeRange===r ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>{r}</button>
                            ))}
                        </div>
                    </div>

                    {/* Chart & Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl min-h-[400px]">
                            {loading ? (
                                <div className="h-full flex items-center justify-center text-slate-500 animate-pulse">Chargement...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={350}>
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={stockInfo.change>=0?"#4ade80":"#f87171"} stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor={stockInfo.change>=0?"#4ade80":"#f87171"} stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                                        <XAxis dataKey="name" tick={{fill:'#64748b', fontSize:12}} minTickGap={30}/>
                                        <YAxis orientation="right" domain={['auto','auto']} tick={{fill:'#64748b', fontSize:12}} tickFormatter={(v)=>v.toFixed(2)}/>
                                        <Tooltip contentStyle={{backgroundColor:'#0f172a', borderColor:'#334155', color:'#fff'}} formatter={(v)=>[v.toFixed(2), 'Prix']}/>
                                        <Area type="monotone" dataKey="prix" stroke={stockInfo.change>=0?"#4ade80":"#f87171"} strokeWidth={2} fill="url(#colorPrice)"/>
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Info & News */}
                        <div className="flex flex-col gap-6">
                            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Briefcase size={18} className="text-blue-400"/> Fondamentaux</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">Cap. Boursière</span> <span>{formatNumber(stockInfo.mktCap)}</span></div>
                                    <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">P/E Ratio</span> <span>{stockInfo.peRatio?.toFixed(2) || '-'}</span></div>
                                    <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">Secteur</span> <span>{stockInfo.sector}</span></div>
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 flex-1 overflow-hidden">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Globe size={18} className="text-blue-400"/> Actualités</h3>
                                <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
                                    {news.length > 0 ? news.map((n) => (
                                        <a key={n.uuid} href={n.link} target="_blank" rel="noreferrer" className="block group">
                                            <h4 className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-2">{n.title}</h4>
                                            <div className="flex justify-between mt-1 text-xs text-slate-500">
                                                <span>{n.publisher}</span>
                                                <span>{new Date(n.providerPublishTime * 1000).toLocaleDateString()}</span>
                                            </div>
                                        </a>
                                    )) : <p className="text-slate-500 text-sm">Aucune actualité récente.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VUE SECTEURS */}
            {activeTab === 'sectors' && (
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl font-bold mb-6">Explorer le Marché</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(MARKET_SECTORS).map(([sector, stocks]) => (
                            <div key={sector} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all">
                                <h3 className="text-xl font-bold text-blue-400 mb-4">{sector}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {stocks.map(sym => (
                                        <button 
                                            key={sym} 
                                            onClick={() => { setSelectedStock(sym); setActiveTab('dashboard'); }}
                                            className="px-3 py-1 bg-slate-800 hover:bg-blue-600 hover:text-white rounded-full text-sm transition-colors"
                                        >
                                            {sym}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* VUE COMPARATEUR */}
            {activeTab === 'compare' && (
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">Comparateur d'Actions</h2>
                        <button onClick={fetchCompareData} className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500"><RefreshCw size={20}/></button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                        {compareList.map(sym => (
                            <div key={sym} className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg">
                                {sym}
                                <button onClick={() => setCompareList(compareList.filter(s => s !== sym))} className="text-slate-400 hover:text-red-400"><Trash2 size={14}/></button>
                            </div>
                        ))}
                        <div className="text-sm text-slate-500 flex items-center ml-2">Use search bar to add</div>
                    </div>

                    {loadingCompare ? (
                        <div className="text-center py-20 text-slate-500">Chargement des données comparatives...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {compareData.map(data => (
                                <div key={data.symbol} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-2xl font-bold">{data.symbol}</h3>
                                            <div className="text-sm text-slate-400 truncate w-48">{data.name}</div>
                                        </div>
                                        <div className={`text-right ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            <div className="text-2xl font-bold">${data.price?.toFixed(2)}</div>
                                            <div className="text-sm">{formatSigned(data.changePercent)}%</div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between py-1 border-b border-slate-800">
                                            <span className="text-slate-500">Cap. Boursière</span>
                                            <span>{formatNumber(data.mktCap)}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-slate-800">
                                            <span className="text-slate-500">P/E Ratio</span>
                                            <span>{data.peRatio?.toFixed(2) || '-'}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-slate-800">
                                            <span className="text-slate-500">Secteur</span>
                                            <span className="truncate w-32 text-right">{data.sector}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

        </main>
      </div>
    </div>
  );
}