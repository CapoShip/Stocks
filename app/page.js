'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, Search, Plus, Trash2, RefreshCw, Briefcase, Globe, BarChart2, Layers, GitCompare, ExternalLink, MessageSquare, X, Send, Bot, Sparkles, ArrowRight, Star, TrendingUp, TrendingDown, ChevronDown
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

const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    try {
        const date = new Date(timestamp * 1000);
        if (isNaN(date.getTime())) return "Récemment";
        
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 3600;
        if (interval > 24) return date.toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'});
        if (interval > 1) return "Il y a " + Math.floor(interval) + " h";
        interval = seconds / 60;
        if (interval > 1) return "Il y a " + Math.floor(interval) + " min";
        return "À l'instant";
    } catch (e) {
        return "";
    }
};

// --- IA ---
const generateSmartReply = (input, stock) => {
    if (!stock) return "Veuillez d'abord sélectionner une action.";
    const lower = input.toLowerCase();
    
    if (lower.includes('analyse')) return `📈 **Analyse ${stock.symbol}**\n• Tendance : ${stock.change >= 0 ? "Haussière" : "Baissière"}\n• P/E Ratio : ${stock.peRatio || 'N/A'}\n• Volatilité : ${stock.beta || 'Moyenne'}\n• Consensus : ${stock.recommendation?.replace(/_/g, ' ') || 'Neutre'}`;
    
    if (lower.includes('acheter')) return `⚠️ **Avis Technique**\nLe titre est à $${stock.price}. Avec un objectif moyen à $${stock.targetPrice || '?'}, le potentiel est de ${stock.targetPrice ? ((stock.targetPrice - stock.price)/stock.price*100).toFixed(1) : 0}%.\nCeci n'est pas un conseil d'investissement.`;

    return "Je peux analyser la tendance, les fondamentaux ou le consensus des analystes. Posez-moi une question !";
};

export default function StockApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStock, setSelectedStock] = useState('NVDA'); 
  const [watchlist, setWatchlist] = useState(['AAPL', 'NVDA', 'TSLA', 'AMZN']);
  
  // Dashboard
  const [activeRange, setActiveRange] = useState('1M');
  const [stockInfo, setStockInfo] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visibleNewsCount, setVisibleNewsCount] = useState(4); // Nombre de news visibles par défaut

  // Watchlist
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

  // IA
  const [showAI, setShowAI] = useState(false);
  const [aiMessages, setAiMessages] = useState([{ role: 'ai', text: "Bonjour ! Je suis votre analyste personnel." }]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef(null);

  // --- FETCH DASHBOARD ---
  const fetchStockData = async (symbol, rangeKey) => {
    setLoading(true);
    setVisibleNewsCount(4); // Reset news count on new stock
    const { range, interval } = TIME_RANGES[rangeKey];
    try {
      const res = await fetch(`/api/stock?symbol=${symbol}&range=${range}&interval=${interval}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStockInfo(data);
      setNews(data.news || []); 
      
      const formattedChart = (data.chart || []).map(item => {
        const d = new Date(item.date);
        let label = "";
        // Formatage court des dates pour l'axe X
        if (rangeKey === '1J') label = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        else if (rangeKey === '5J') label = d.toLocaleDateString([], {weekday:'short', hour:'2-digit'});
        else label = d.toLocaleDateString([], {day:'numeric', month:'short'}); // ex: 24 Nov
        
        return { name: label, prix: item.prix, fullDate: d.toLocaleString() };
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

  // --- RECHERCHE ---
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.length < 1) { setSuggestions([]); return; }

    searchTimeout.current = setTimeout(async () => {
        try {
            const res = await fetch(`/api/search?q=${val}`);
            const data = await res.json();
            setSuggestions(data.results || []);
            setShowSuggestions(true);
        } catch (e) { console.error(e); }
    }, 300);
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

  // --- WATCHLIST ---
  const toggleWatchlist = (symbol) => {
      if (watchlist.includes(symbol)) setWatchlist(watchlist.filter(s => s !== symbol));
      else setWatchlist([...watchlist, symbol]);
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

  // --- COMPARE ---
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

  // --- AI ---
  const handleAiSend = (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    const userMsg = { role: 'user', text: aiInput };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setIsAiTyping(true);

    setTimeout(() => {
        const reply = generateSmartReply(userMsg.text, stockInfo);
        setAiMessages(prev => [...prev, { role: 'ai', text: reply }]);
        setIsAiTyping(false);
    }, 1000);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-30">
        <div className="p-6 text-xl font-bold text-blue-400 flex items-center gap-2">
            <Activity /> <span className="hidden md:block">AlphaTrade</span>
        </div>
        
        <nav className="flex-1 px-2 space-y-2 mt-4">
            {['dashboard', 'watchlist', 'sectors', 'compare'].map(tab => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)} 
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab===tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                    {tab === 'dashboard' && <BarChart2 size={20} />}
                    {tab === 'watchlist' && <Star size={20} />}
                    {tab === 'sectors' && <Layers size={20} />}
                    {tab === 'compare' && <GitCompare size={20} />}
                    <span className="hidden md:block capitalize">{tab}</span>
                </button>
            ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur z-20">
            <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                    type="text" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder={activeTab === 'compare' ? "Ajouter au comparateur..." : "Rechercher (ex: Apple)..."}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-12 left-0 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                        {suggestions.map((s) => (
                            <div key={s.symbol} onClick={() => selectSuggestion(s.symbol)} className="p-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 group">
                                <div className="flex justify-between">
                                    <span className="font-bold text-white group-hover:text-blue-400 transition-colors">{s.symbol}</span>
                                    <span className="text-xs text-slate-500">{s.exch}</span>
                                </div>
                                <div className="text-xs text-slate-400 truncate">{s.name}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <button 
                onClick={() => setShowAI(!showAI)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all hover:scale-105 active:scale-95 ${showAI ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-900/50' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}
            >
                {showAI ? <Sparkles size={18} className="animate-pulse"/> : <Bot size={18} />} 
                <span className="hidden md:inline font-medium">Assistant IA</span>
            </button>
        </header>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950 relative custom-scrollbar">
            
            {/* VUE DASHBOARD */}
            {activeTab === 'dashboard' && stockInfo && (
                <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                {stockInfo.name} <span className="text-xl text-slate-500">({stockInfo.symbol})</span>
                                <button 
                                    onClick={() => toggleWatchlist(stockInfo.symbol)} 
                                    className={`transition-all hover:scale-110 ${watchlist.includes(stockInfo.symbol) ? 'text-yellow-400' : 'text-slate-600 hover:text-yellow-400'}`}
                                >
                                    <Star fill={watchlist.includes(stockInfo.symbol) ? "currentColor" : "none"} />
                                </button>
                            </h1>
                            <div className="flex items-baseline gap-3 mt-1">
                                <span className="text-4xl font-bold tracking-tight">${stockInfo.price?.toFixed(2)}</span>
                                <span className={`text-lg font-medium flex items-center px-2 py-0.5 rounded-lg ${stockInfo.change >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {stockInfo.change >= 0 ? <TrendingUp size={18} className="mr-1"/> : <TrendingDown size={18} className="mr-1"/>}
                                    {formatSigned(stockInfo.change)} ({formatSigned(stockInfo.changePercent)}%)
                                </span>
                                <span className="text-xs text-slate-500">Sur {activeRange}</span>
                            </div>
                        </div>
                        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                            {Object.keys(TIME_RANGES).map(r => (
                                <button key={r} onClick={() => setActiveRange(r)} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeRange===r ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>{r}</button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-1 border border-slate-800 shadow-xl min-h-[400px]">
                        {loading ? (
                            <div className="h-[400px] flex items-center justify-center text-slate-500 animate-pulse">Chargement des données...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={400}>
                                <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={stockInfo.change>=0?"#4ade80":"#f87171"} stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor={stockInfo.change>=0?"#4ade80":"#f87171"} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                                    {/* FIX AXE X : minTickGap plus grand pour espacer les dates */}
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{fill:'#64748b', fontSize:11}} 
                                        minTickGap={50} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        dy={10}
                                    />
                                    <YAxis 
                                        orientation="right" 
                                        domain={['auto','auto']} 
                                        tick={{fill:'#64748b', fontSize:11}} 
                                        tickFormatter={(v)=>v.toFixed(2)} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        dx={10}
                                    />
                                    <Tooltip 
                                        contentStyle={{backgroundColor:'#0f172a', borderColor:'#334155', color:'#fff', borderRadius:'8px'}} 
                                        itemStyle={{color: stockInfo.change>=0?"#4ade80":"#f87171"}}
                                        labelStyle={{color: '#94a3b8', marginBottom: '0.5rem'}}
                                        formatter={(v)=>[v.toFixed(2), 'Prix']}
                                        cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        isAnimationActive={false} // Fix pour le curseur
                                    />
                                    <Area type="monotone" dataKey="prix" stroke={stockInfo.change>=0?"#4ade80":"#f87171"} strokeWidth={2} fill="url(#colorPrice)" isAnimationActive={false}/>
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 h-fit">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Briefcase size={18} className="text-blue-400"/> Fondamentaux</h3>
                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between pb-2 border-b border-slate-800"><span className="text-slate-400">Cap. Boursière</span> <span className="font-mono">{formatNumber(stockInfo.mktCap)}</span></div>
                                <div className="flex justify-between pb-2 border-b border-slate-800"><span className="text-slate-400">P/E Ratio</span> <span className="font-mono">{stockInfo.peRatio?.toFixed(2) || '-'}</span></div>
                                <div className="flex justify-between pb-2 border-b border-slate-800"><span className="text-slate-400">Prix Cible (1A)</span> <span className="text-green-400 font-mono">{stockInfo.targetPrice ? '$'+stockInfo.targetPrice : '-'}</span></div>
                                <div className="flex justify-between pb-2 border-b border-slate-800"><span className="text-slate-400">Recommandation</span> <span className="uppercase font-bold text-yellow-400 text-xs bg-yellow-400/10 px-2 py-1 rounded">{stockInfo.recommendation?.replace(/_/g, ' ')}</span></div>
                                <div className="flex justify-between pb-2 border-b border-slate-800"><span className="text-slate-400">Secteur</span> <span className="text-right truncate w-32 text-slate-200">{stockInfo.sector}</span></div>
                            </div>
                            <div className="mt-6">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">À propos (Résumé)</h4>
                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-4 hover:line-clamp-none transition-all cursor-pointer text-justify">
                                    {/* FIX: Résumé du texte si trop long */}
                                    {stockInfo.description?.length > 300 
                                        ? stockInfo.description.substring(0, 300) + "..." 
                                        : stockInfo.description}
                                </p>
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 border border-slate-800 flex flex-col">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Globe size={18} className="text-blue-400"/> Actualités en direct</h3>
                            
                            <div className="space-y-3 flex-1">
                                {news.length > 0 ? (
                                    <>
                                        {news.slice(0, visibleNewsCount).map((n) => (
                                            <a key={n.uuid} href={n.link} target="_blank" rel="noreferrer" className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-slate-800 hover:border-blue-500 hover:bg-slate-800/50 transition-all group">
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">{n.publisher}</span>
                                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                                            {timeAgo(n.providerPublishTime)} <ExternalLink size={10}/>
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-medium text-slate-200 group-hover:text-blue-300 transition-colors leading-snug">{n.title}</h4>
                                                </div>
                                            </a>
                                        ))}
                                        
                                        {/* FIX: BOUTON CHARGER PLUS */}
                                        {visibleNewsCount < news.length && (
                                            <button 
                                                onClick={() => setVisibleNewsCount(prev => prev + 4)}
                                                className="w-full py-3 mt-4 flex items-center justify-center gap-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors"
                                            >
                                                <ChevronDown size={16} /> Charger plus d'actualités
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
            )}

            {/* VUE WATCHLIST */}
            {activeTab === 'watchlist' && (
                <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Star className="text-yellow-400" fill="currentColor"/> Ma Liste de Surveillance</h2>
                        <button onClick={fetchWatchlistData} className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"><RefreshCw size={20}/></button>
                    </div>

                    {loadingWatchlist ? (
                        <div className="text-center py-20 text-slate-500 animate-pulse">Chargement de vos favoris...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {watchlistData.map(data => (
                                <div key={data.symbol} onClick={() => { setSelectedStock(data.symbol); setActiveTab('dashboard'); }} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden cursor-pointer hover:border-blue-500 hover:shadow-lg hover:shadow-blue-900/10 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">{data.symbol}</h3>
                                            <div className="text-sm text-slate-400 truncate w-48">{data.name}</div>
                                        </div>
                                        <div className={`text-right ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            <div className="text-2xl font-bold">${data.price?.toFixed(2)}</div>
                                            <div className="text-sm font-medium">{formatSigned(data.changePercent)}%</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleWatchlist(data.symbol); }} 
                                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-opacity p-2 bg-slate-950 rounded-full shadow-sm"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            ))}
                            {watchlistData.length === 0 && (
                                <div className="col-span-full text-center py-12 text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                                    <Star size={48} className="mx-auto mb-4 text-slate-700"/>
                                    <p>Votre liste est vide.</p>
                                    <p className="text-sm mt-2">Recherchez une action et cliquez sur l'étoile pour l'ajouter ici.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* VUE SECTEURS */}
            {activeTab === 'sectors' && (
                <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Layers className="text-blue-500"/> Explorer les Secteurs</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(MARKET_SECTORS).map(([sector, stocks]) => (
                            <div key={sector} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-900/10">
                                <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                                    {sector}
                                    <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full ml-auto font-normal">{stocks.length} actions</span>
                                </h3>
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
                <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><GitCompare className="text-blue-500"/> Comparateur</h2>
                        <button onClick={fetchCompareData} className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"><RefreshCw size={20}/></button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-8 bg-slate-900 p-4 rounded-xl border border-slate-800">
                        {compareList.map(sym => (
                            <div key={sym} className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 shadow-sm">
                                <span className="font-bold text-white">{sym}</span>
                                <button onClick={() => setCompareList(compareList.filter(s => s !== sym))} className="text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
                            </div>
                        ))}
                        <div className="text-sm text-slate-500 flex items-center ml-2 italic">Utilisez la barre de recherche en haut pour ajouter</div>
                    </div>

                    {loadingCompare ? (
                        <div className="text-center py-20 text-slate-500 animate-pulse">Comparaison en cours...</div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-xl">
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
                                            <td className="p-4 text-right font-mono text-lg font-bold">${data.price?.toFixed(2)}</td>
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
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}`}>
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
                    <div ref={chatEndRef} />
                </div>
                
                <form onSubmit={handleAiSend} className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2">
                    <input 
                        type="text" 
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        placeholder="Posez une question sur cette action..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <button type="submit" disabled={!aiInput.trim()} className="p-2 bg-purple-600 rounded-full hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white shadow-lg shadow-purple-900/20">
                        <ArrowRight size={18}/>
                    </button>
                </form>
            </div>
        )}

      </div>
    </div>
  );
}