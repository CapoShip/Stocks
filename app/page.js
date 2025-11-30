'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, Search, Plus, Trash2, RefreshCw, Briefcase, Globe, BarChart2, Layers, GitCompare, ExternalLink, MessageSquare, X, Send, Bot, Sparkles, ArrowRight, Star
} from 'lucide-react';

// --- CONFIGURATION ---
const TIME_RANGES = {
  '1J': { label: '1J', range: '1d', interval: '5m' },
  '5J': { label: '5J', range: '5d', interval: '15m' },
  '1M': { label: '1M', range: '1mo', interval: '1d' },
  '6M': { label: '6M', range: '6mo', interval: '1d' },
  '1A': { label: '1A', range: '1y', interval: '1wk' },
};

const MARKET_SECTORS = {
  'Technologie': ['AAPL', 'MSFT', 'NVDA', 'AMD', 'GOOGL', 'META'],
  'Finance': ['JPM', 'BAC', 'V', 'MA', 'GS'],
  'Auto': ['TSLA', 'F', 'GM', 'TM', 'RACE'],
  'Santé': ['JNJ', 'PFE', 'LLY', 'MRK'],
  'Crypto': ['BTC-USD', 'ETH-USD', 'SOL-USD', 'DOGE-USD']
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStock, setSelectedStock] = useState('NVDA'); 
  const [watchlist, setWatchlist] = useState(['AAPL', 'NVDA', 'TSLA', 'AMZN']);
  
  // Dashboard Data
  const [activeRange, setActiveRange] = useState('1M');
  const [stockInfo, setStockInfo] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);

  // Watchlist Data
  const [watchlistData, setWatchlistData] = useState([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);

  // Recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef(null);

  // Comparateur
  const [compareList, setCompareList] = useState(['AAPL', 'MSFT', 'GOOGL']);
  const [compareData, setCompareData] = useState([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Assistant IA
  const [showAI, setShowAI] = useState(false);
  const [aiMessages, setAiMessages] = useState([
      { role: 'ai', text: "Bonjour ! Je suis Gemini-Lite. Je peux analyser le titre affiché ou comparer des actions." }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // --- 1. MOTEUR DASHBOARD ---
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

  // --- 2. MOTEUR RECHERCHE (CORRIGÉ) ---
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (val.length < 1) { 
        setSuggestions([]); 
        return; 
    }

    searchTimeout.current = setTimeout(async () => {
        try {
            const res = await fetch(`/api/search?q=${val}`);
            const data = await res.json();
            setSuggestions(data.results || []);
            setShowSuggestions(true);
        } catch (e) { console.error(e); }
    }, 300);
  };

  // Fonction pour lancer une recherche directe (Touche Entrée)
  const handleSearchSubmit = (e) => {
      e.preventDefault();
      if (searchQuery.trim()) {
          setSelectedStock(searchQuery.toUpperCase());
          setActiveTab('dashboard');
          setSearchQuery('');
          setShowSuggestions(false);
      }
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

  // --- 3. GESTION WATCHLIST (CORRIGÉ) ---
  const toggleWatchlist = (symbol) => {
      if (watchlist.includes(symbol)) {
          setWatchlist(watchlist.filter(s => s !== symbol));
      } else {
          setWatchlist([...watchlist, symbol]);
      }
  };

  const fetchWatchlistData = async () => {
    setLoadingWatchlist(true);
    const newData = [];
    for (const sym of watchlist) {
        try {
            const res = await fetch(`/api/stock?symbol=${sym}&range=1d`); 
            const data = await res.json();
            if (res.ok) newData.push(data);
        } catch (e) { console.error(e); }
    }
    setWatchlistData(newData);
    setLoadingWatchlist(false);
  };

  useEffect(() => {
    if (activeTab === 'watchlist') fetchWatchlistData();
  }, [activeTab, watchlist]);

  // --- 4. COMPARATEUR ---
  const fetchCompareData = async () => {
    setLoadingCompare(true);
    const newData = [];
    for (const sym of compareList) {
        try {
            const res = await fetch(`/api/stock?symbol=${sym}&range=1d`); 
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

  // --- 5. AI ---
  const handleAiSend = (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    const userMsg = { role: 'user', text: aiInput };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setIsAiTyping(true);

    setTimeout(() => {
        let reply = "Je n'ai pas compris.";
        const lower = userMsg.text.toLowerCase();
        
        if (lower.includes('analyse') && stockInfo) {
            reply = `Analyse de ${stockInfo.name}:\nTendance: ${stockInfo.change >= 0 ? 'Haussière' : 'Baissière'}\nSecteur: ${stockInfo.sector}\nP/E: ${stockInfo.peRatio || 'N/A'}`;
        } else if (lower.includes('acheter')) {
            reply = "Ceci n'est pas un conseil financier. Cependant, les analystes semblent " + (stockInfo?.recommendation === 'buy' ? 'optimistes.' : 'prudents.');
        } else {
            reply = "Je peux analyser une action ou comparer des données. Essayez 'Analyse ce titre'.";
        }
        
        setAiMessages(prev => [...prev, { role: 'ai', text: reply }]);
        setIsAiTyping(false);
    }, 800);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-30">
        <div className="p-6 text-xl font-bold text-blue-400 flex items-center gap-2">
            <Activity /> <span className="hidden md:block">AlphaTrade</span>
        </div>
        
        <nav className="flex-1 px-2 space-y-2 mt-4">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${activeTab==='dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <BarChart2 size={20} /> <span className="hidden md:block">Dashboard</span>
            </button>
            <button onClick={() => setActiveTab('watchlist')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${activeTab==='watchlist' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <Star size={20} /> <span className="hidden md:block">Ma Liste</span>
            </button>
            <button onClick={() => setActiveTab('sectors')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${activeTab==='sectors' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <Layers size={20} /> <span className="hidden md:block">Marché</span>
            </button>
            <button onClick={() => setActiveTab('compare')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${activeTab==='compare' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <GitCompare size={20} /> <span className="hidden md:block">Comparateur</span>
            </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur z-20">
            <form onSubmit={handleSearchSubmit} className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                    type="text" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder={activeTab === 'compare' ? "Ajouter au comparateur..." : "Rechercher (ex: Apple)..."}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => setShowSuggestions(true)}
                    // Petit délai pour permettre le clic sur la suggestion
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-12 left-0 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                        {suggestions.map((s) => (
                            <div key={s.symbol} onClick={() => selectSuggestion(s.symbol)} className="p-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0">
                                <div className="flex justify-between">
                                    <span className="font-bold text-white">{s.symbol}</span>
                                    <span className="text-xs text-slate-500">{s.exch}</span>
                                </div>
                                <div className="text-xs text-slate-400 truncate">{s.name}</div>
                            </div>
                        ))}
                    </div>
                )}
            </form>
            
            <button 
                onClick={() => setShowAI(!showAI)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${showAI ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-900/50' : 'border-slate-700 text-slate-400 hover:text-white'}`}
            >
                {showAI ? <Sparkles size={18} className="animate-pulse"/> : <Bot size={18} />} 
                <span>Assistant AI</span>
            </button>
        </header>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950 relative">
            
            {/* VUE DASHBOARD */}
            {activeTab === 'dashboard' && stockInfo && (
                <div className="space-y-6 max-w-7xl mx-auto pb-20">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                                {stockInfo.name} <span className="text-xl text-slate-500">({stockInfo.symbol})</span>
                                <button 
                                    onClick={() => toggleWatchlist(stockInfo.symbol)} 
                                    className={`ml-2 transition-colors ${watchlist.includes(stockInfo.symbol) ? 'text-yellow-400' : 'text-slate-600 hover:text-yellow-400'}`}
                                >
                                    <Star fill={watchlist.includes(stockInfo.symbol) ? "currentColor" : "none"} />
                                </button>
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

                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl min-h-[400px]">
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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Briefcase size={18} className="text-blue-400"/> Fondamentaux</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">Cap. Boursière</span> <span>{formatNumber(stockInfo.mktCap)}</span></div>
                                <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">P/E Ratio</span> <span>{stockInfo.peRatio?.toFixed(2) || '-'}</span></div>
                                <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">Prix Cible (1A)</span> <span className="text-green-400">{stockInfo.targetPrice ? '$'+stockInfo.targetPrice : '-'}</span></div>
                                <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">Secteur</span> <span className="text-right truncate w-32">{stockInfo.sector}</span></div>
                            </div>
                            <div className="mt-4 pt-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Description</h4>
                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
                                    {stockInfo.description}
                                </p>
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 border border-slate-800">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Globe size={18} className="text-blue-400"/> Actualités en direct</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {news.length > 0 ? news.map((n) => (
                                    <a key={n.uuid} href={n.link} target="_blank" rel="noreferrer" className="block bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-blue-500 transition-all group h-full flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold text-blue-400">{n.publisher}</span>
                                                <ExternalLink size={12} className="text-slate-600 group-hover:text-blue-400"/>
                                            </div>
                                            <h4 className="text-sm font-medium text-slate-200 mb-2 line-clamp-2 group-hover:text-blue-300">{n.title}</h4>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            {new Date(n.providerPublishTime * 1000).toLocaleDateString('fr-FR', {
                                                day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </a>
                                )) : (
                                    <div className="col-span-2 text-center py-10 text-slate-500 bg-slate-950 rounded-xl border border-slate-800 border-dashed">
                                        Aucune actualité récente trouvée pour ce titre via l'API.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VUE WATCHLIST (MA LISTE) */}
            {activeTab === 'watchlist' && (
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Star className="text-yellow-400" fill="currentColor"/> Ma Liste de Surveillance</h2>
                        <button onClick={fetchWatchlistData} className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"><RefreshCw size={20}/></button>
                    </div>

                    {loadingWatchlist ? (
                        <div className="text-center py-20 text-slate-500 animate-pulse">Chargement de vos favoris...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {watchlistData.map(data => (
                                <div key={data.symbol} onClick={() => { setSelectedStock(data.symbol); setActiveTab('dashboard'); }} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden cursor-pointer hover:border-blue-500 transition-all group">
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
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleWatchlist(data.symbol); }} 
                                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-opacity p-2"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            ))}
                            {watchlistData.length === 0 && (
                                <div className="col-span-full text-center py-10 text-slate-500">
                                    Votre liste est vide. Recherchez une action et cliquez sur l'étoile pour l'ajouter.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* VUE SECTEURS */}
            {activeTab === 'sectors' && (
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Layers className="text-blue-500"/> Explorer les Secteurs</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(MARKET_SECTORS).map(([sector, stocks]) => (
                            <div key={sector} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all cursor-default">
                                <h3 className="text-xl font-bold text-blue-400 mb-4">{sector}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {stocks.map(sym => (
                                        <button 
                                            key={sym} 
                                            onClick={() => { setSelectedStock(sym); setActiveTab('dashboard'); }}
                                            className="px-3 py-1 bg-slate-950 border border-slate-700 hover:bg-blue-600 hover:border-blue-600 hover:text-white rounded-full text-sm transition-all"
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
                        <h2 className="text-2xl font-bold flex items-center gap-2"><GitCompare className="text-blue-500"/> Comparateur</h2>
                        <button onClick={fetchCompareData} className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"><RefreshCw size={20}/></button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-8 bg-slate-900 p-4 rounded-xl border border-slate-800">
                        {compareList.map(sym => (
                            <div key={sym} className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                                <span className="font-bold">{sym}</span>
                                <button onClick={() => setCompareList(compareList.filter(s => s !== sym))} className="text-slate-400 hover:text-red-400"><Trash2 size={14}/></button>
                            </div>
                        ))}
                        <div className="text-sm text-slate-500 flex items-center ml-2 italic">Utilisez la barre de recherche en haut pour ajouter</div>
                    </div>

                    {loadingCompare ? (
                        <div className="text-center py-20 text-slate-500 animate-pulse">Chargement du tableau comparatif...</div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-800">
                            <table className="w-full bg-slate-900 text-left text-sm">
                                <thead className="bg-slate-950 text-slate-400 uppercase text-xs">
                                    <tr>
                                        <th className="p-4 font-semibold">Symbole</th>
                                        <th className="p-4 font-semibold">Nom</th>
                                        <th className="p-4 font-semibold text-right">Prix</th>
                                        <th className="p-4 font-semibold text-right">Var. (1J)</th>
                                        <th className="p-4 font-semibold text-right">Cap. Boursière</th>
                                        <th className="p-4 font-semibold text-right">P/E</th>
                                        <th className="p-4 font-semibold text-right">Secteur</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {compareData.map(data => (
                                        <tr key={data.symbol} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="p-4 font-bold text-blue-400">{data.symbol}</td>
                                            <td className="p-4 text-slate-300 max-w-[150px] truncate" title={data.name}>{data.name}</td>
                                            <td className="p-4 text-right font-mono text-lg">${data.price?.toFixed(2)}</td>
                                            <td className={`p-4 text-right font-bold ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {formatSigned(data.changePercent)}%
                                            </td>
                                            <td className="p-4 text-right text-slate-300">{formatNumber(data.mktCap)}</td>
                                            <td className="p-4 text-right text-slate-300">{data.peRatio?.toFixed(2) || '-'}</td>
                                            <td className="p-4 text-right text-slate-400">{data.sector}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

        </main>

        {/* PANNEAU ASSISTANT IA */}
        {showAI && (
            <div className="absolute top-0 right-0 w-full md:w-[400px] h-full bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-purple-400"><Sparkles size={18}/> Gemini-Lite Assistant</h3>
                    <button onClick={() => setShowAI(false)} className="hover:text-white text-slate-500"><X size={20}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
                    {aiMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isAiTyping && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800 p-3 rounded-2xl rounded-bl-none flex gap-1">
                                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75"></span>
                                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    )}
                </div>
                
                <form onSubmit={handleAiSend} className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2">
                    <input 
                        type="text" 
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        placeholder="Posez une question sur cette action..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <button type="submit" disabled={!aiInput.trim()} className="p-2 bg-purple-600 rounded-full hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white">
                        <ArrowRight size={18}/>
                    </button>
                </form>
            </div>
        )}

      </div>
    </div>
  );
}