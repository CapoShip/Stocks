'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, Search, Plus, Trash2, RefreshCw, Briefcase, Globe, BarChart2, Layers, GitCompare, ExternalLink, MessageSquare, X, Send, Bot, Sparkles, ArrowRight, Star, TrendingUp, TrendingDown, ChevronDown, ChevronUp, ArrowLeft
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
    } catch (e) { return ""; }
};

// --- IA AVANCÉE (Simulée localement) ---
const generateAdvancedAnalysis = (stock) => {
    if (!stock) return "Veuillez sélectionner une action.";
    
    const isBullish = stock.change >= 0;
    const analystRec = stock.recommendation?.toUpperCase().replace(/_/g, ' ') || "NEUTRE";
    const upside = stock.targetPrice ? ((stock.targetPrice - stock.price) / stock.price * 100).toFixed(1) : 0;
    const volatility = stock.beta > 1.5 ? "élevée" : "modérée";
    
    // Construction d'une réponse structurée
    return `🤖 **Analyse IA pour ${stock.name}**\n\n` +
           `**1. État du Marché :**\n` +
           `Le titre s'échange à $${stock.price} avec une tendance ${isBullish ? "haussière 🟢" : "baissière 🔴"} sur la période (${formatSigned(stock.changePercent)}%).\n\n` +
           `**2. Fondamentaux :**\n` +
           `• P/E Ratio : ${stock.peRatio?.toFixed(2) || 'N/A'} (Valorisation)\n` +
           `• Volatilité : ${volatility} (Beta: ${stock.beta?.toFixed(2) || '-'}) \n` +
           `• Plus haut 52 sem : $${stock.high52}\n\n` +
           `**3. Consensus des Pros :**\n` +
           `Les analystes sont **${analystRec}** avec un objectif moyen à $${stock.targetPrice || '?'} (Potentiel : ${formatSigned(upside)}%).\n\n` +
           `*Conclusion : ${upside > 15 ? "Opportunité de croissance intéressante." : "Le titre semble correctement valorisé à ce stade."}*`;
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
  const [visibleNewsCount, setVisibleNewsCount] = useState(3);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Watchlist & Secteurs
  const [sectorData, setSectorData] = useState([]);
  const [selectedSector, setSelectedSector] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [watchlistData, setWatchlistData] = useState([]);

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
  const [aiMessages, setAiMessages] = useState([{ role: 'ai', text: "Bonjour ! Je suis Gemini-Trade. Je peux analyser en profondeur n'importe quelle action. Essayez 'Analyse complète' !" }]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef(null);

  // --- FETCH DASHBOARD ---
  const fetchStockData = async (symbol, rangeKey) => {
    setLoading(true);
    setVisibleNewsCount(3);
    setShowFullDescription(false);
    const { range, interval } = TIME_RANGES[rangeKey];
    try {
      const res = await fetch(`/api/stock?symbol=${symbol}&range=${range}&interval=${interval}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStockInfo(data);
      setNews(data.news || []); 
      
      const formattedChart = (data.chart || []).map(item => {
        const d = new Date(item.date);
        return { 
            timestamp: d.getTime(), // Clé pour fluidité
            prix: item.prix, 
            dateObj: d 
        };
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
    if (val.length < 1) { setSuggestions([]); setShowSuggestions(false); return; }

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

  // --- WATCHLIST & SECTEURS ---
  const fetchMultipleStocks = async (symbols, targetSetter) => {
    setLoadingList(true);
    const promises = symbols.map(sym => 
        fetch(`/api/stock?symbol=${sym}&range=1d`).then(r => r.json()).catch(e => null)
    );
    const results = await Promise.all(promises);
    targetSetter(results.filter(r => r && !r.error));
    setLoadingList(false);
  };

  useEffect(() => {
      if (activeTab === 'sectors' && selectedSector) fetchMultipleStocks(MARKET_SECTORS[selectedSector], setSectorData);
  }, [selectedSector, activeTab]);

  useEffect(() => {
      if (activeTab === 'watchlist') fetchMultipleStocks(watchlist, setWatchlistData);
  }, [activeTab, watchlist]);

  const toggleWatchlist = (symbol) => {
      if (watchlist.includes(symbol)) setWatchlist(watchlist.filter(s => s !== symbol));
      else setWatchlist([...watchlist, symbol]);
  };

  // --- COMPARE ---
  const fetchCompareData = async () => {
    setLoadingCompare(true);
    const promises = compareList.map(sym => fetch(`/api/stock?symbol=${sym}&range=1d`).then(r => r.json()).catch(e => null));
    const results = await Promise.all(promises);
    setCompareData(results.filter(r => r && !r.error));
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
        const reply = generateAdvancedAnalysis(stockInfo);
        setAiMessages(prev => [...prev, { role: 'ai', text: reply }]);
        setIsAiTyping(false);
    }, 1200);
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMessages]);

  const formatXAxis = (timestamp) => {
      const date = new Date(timestamp);
      if (activeRange === '1J') return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      if (activeRange === '5J') return date.toLocaleDateString([], {weekday: 'short'});
      return date.toLocaleDateString([], {day: 'numeric', month: 'short'});
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-30">
        <div className="p-6 text-xl font-bold text-blue-400 flex items-center gap-2">
            <Activity /> <span className="hidden md:block">AlphaTrade</span>
        </div>
        <nav className="flex-1 px-2 space-y-2 mt-4">
            {['dashboard', 'watchlist', 'sectors', 'compare'].map(tab => (
                <button key={tab} onClick={() => { setActiveTab(tab); if(tab==='sectors') setSelectedSector(null); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab===tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
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
                    // Utilisation de onMouseDown pour la suggestion pour éviter le conflit blur/click
                />
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-12 left-0 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                        {suggestions.map((s) => (
                            <div key={s.symbol} onMouseDown={() => selectSuggestion(s.symbol)} className="p-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 flex justify-between items-center group">
                                <div>
                                    <span className="font-bold text-white group-hover:text-blue-400">{s.symbol}</span>
                                    <div className="text-xs text-slate-400 truncate w-48">{s.name}</div>
                                </div>
                                <span className="text-xs text-slate-500 bg-slate-950 px-2 py-1 rounded">{s.exch}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <button onClick={() => setShowAI(!showAI)} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${showAI ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
                {showAI ? <Sparkles size={18} className="animate-pulse"/> : <Bot size={18} />} <span className="hidden md:inline font-medium">Assistant</span>
            </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-950 relative custom-scrollbar">
            
            {/* VUE DASHBOARD */}
            {activeTab === 'dashboard' && stockInfo && (
                <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                {stockInfo.name} <span className="text-xl text-slate-500">({stockInfo.symbol})</span>
                                <button onClick={() => toggleWatchlist(stockInfo.symbol)} className={`transition-all hover:scale-110 ${watchlist.includes(stockInfo.symbol) ? 'text-yellow-400' : 'text-slate-600 hover:text-yellow-400'}`}><Star fill={watchlist.includes(stockInfo.symbol)?"currentColor":"none"}/></button>
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
                            <div className="h-[400px] flex items-center justify-center text-slate-500 animate-pulse">Chargement...</div>
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
                                    <XAxis dataKey="timestamp" type="number" domain={['auto', 'auto']} tickFormatter={formatXAxis} tick={{fill:'#64748b', fontSize:11}} minTickGap={50} axisLine={false} tickLine={false} dy={10}/>
                                    <YAxis orientation="right" domain={['auto','auto']} tick={{fill:'#64748b', fontSize:11}} tickFormatter={(v)=>v.toFixed(2)} axisLine={false} tickLine={false} dx={10}/>
                                    <Tooltip contentStyle={{backgroundColor:'#0f172a', borderColor:'#334155', color:'#fff', borderRadius:'8px'}} itemStyle={{color: stockInfo.change>=0?"#4ade80":"#f87171"}} labelFormatter={(v) => new Date(v).toLocaleString()} formatter={(v)=>[v.toFixed(2), 'Prix']} cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }} isAnimationActive={false}/>
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
                                <div className="flex justify-between pb-2 border-b border-slate-800"><span className="text-slate-400">Volatilité (Beta)</span> <span className="font-mono">{stockInfo.beta?.toFixed(2) || '-'}</span></div>
                                <div className="flex justify-between pb-2 border-b border-slate-800"><span className="text-slate-400">Secteur</span> <span className="text-right truncate w-32 text-slate-200">{stockInfo.sector}</span></div>
                            </div>
                            <div className="mt-6">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">À propos</h4>
                                <div className="text-xs text-slate-400 leading-relaxed text-justify relative">
                                    <p className={!showFullDescription ? "line-clamp-4" : ""}>
                                        {stockInfo.description}
                                    </p>
                                    <button onClick={() => setShowFullDescription(!showFullDescription)} className="text-blue-400 hover:text-blue-300 mt-2 flex items-center gap-1 font-bold text-xs">
                                        {showFullDescription ? "Réduire" : "Lire la suite"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 border border-slate-800 flex flex-col">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Globe size={18} className="text-blue-400"/> Actualités</h3>
                            <div className="space-y-3 flex-1">
                                {news.length > 0 ? (
                                    <>
                                        {news.slice(0, visibleNewsCount).map((n) => (
                                            <a key={n.uuid} href={n.link} target="_blank" rel="noreferrer" className="flex flex-col gap-1 p-3 rounded-lg border border-slate-800 hover:border-blue-500 hover:bg-slate-800/50 transition-all group">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-blue-400">{n.publisher}</span>
                                                    <span className="text-[10px] text-slate-500">{timeAgo(n.providerPublishTime)}</span>
                                                </div>
                                                <h4 className="text-sm font-medium text-slate-200 group-hover:text-blue-300 transition-colors leading-snug line-clamp-1">{n.title}</h4>
                                            </a>
                                        ))}
                                        {news.length > 3 && (
                                            <button onClick={() => setVisibleNewsCount(prev => prev > 3 ? 3 : prev + 3)} className="w-full py-2 mt-2 flex items-center justify-center gap-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors">
                                                {visibleNewsCount > 3 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                {visibleNewsCount > 3 ? "Voir moins" : "Charger plus"}
                                            </button>
                                        )}
                                    </>
                                ) : <div className="text-center py-10 text-slate-500">Aucune actualité récente.</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VUE WATCHLIST, SECTEURS, COMPARE (Code simplifié ici, identique à avant) */}
            {activeTab === 'watchlist' && (
                <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Star className="text-yellow-400" fill="currentColor"/> Ma Liste</h2>
                    {loadingWatchlist ? <div className="text-center py-20 text-slate-500">Chargement...</div> : 
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {watchlistData.map(data => (
                            <div key={data.symbol} onClick={() => { setSelectedStock(data.symbol); setActiveTab('dashboard'); }} className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-blue-500 group relative">
                                <div className="flex justify-between">
                                    <span className="font-bold text-lg">{data.symbol}</span>
                                    <div className={`text-right ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        <div className="font-bold">${data.price?.toFixed(2)}</div>
                                        <div className="text-xs">{formatSigned(data.changePercent)}%</div>
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); toggleWatchlist(data.symbol); }} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>}
                </div>
            )}

            {activeTab === 'sectors' && (
                <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
                    {selectedSector ? (
                        <div>
                            <button onClick={() => setSelectedSector(null)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6"><ArrowLeft size={20} /> Retour</button>
                            <h2 className="text-2xl font-bold mb-6 text-blue-400">{selectedSector}</h2>
                            {loadingList ? <div className="text-center py-20 text-slate-500">Chargement...</div> : 
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{sectorData.map(d => (
                                <div key={d.symbol} onClick={() => {setSelectedStock(d.symbol); setActiveTab('dashboard');}} className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-blue-500">
                                    <div className="flex justify-between"><span className="font-bold">{d.symbol}</span> <span className={d.change>=0?'text-green-400':'text-red-400'}>{formatSigned(d.changePercent)}%</span></div>
                                    <div className="text-xs text-slate-400 truncate">{d.name}</div>
                                </div>
                            ))}</div>}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(MARKET_SECTORS).map(([sector, stocks]) => (
                                <div key={sector} onClick={() => setSelectedSector(sector)} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-500 cursor-pointer group">
                                    <h3 className="text-xl font-bold text-blue-400 mb-2 group-hover:text-blue-300 flex justify-between">{sector} <ArrowRight className="opacity-0 group-hover:opacity-100"/></h3>
                                    <div className="text-sm text-slate-500">{stocks.length} actions</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'compare' && (
                <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
                    <div className="flex justify-between mb-6"><h2 className="text-2xl font-bold">Comparateur</h2><button onClick={fetchCompareData}><RefreshCw/></button></div>
                    <div className="flex flex-wrap gap-2 mb-6">{compareList.map(s => <span key={s} className="bg-slate-800 px-3 py-1 rounded flex items-center gap-2">{s} <Trash2 size={12} onClick={() => setCompareList(compareList.filter(x=>x!==s))} className="cursor-pointer hover:text-red-400"/></span>)}</div>
                    {loadingCompare ? <div className="text-center text-slate-500">Chargement...</div> : 
                    <div className="overflow-x-auto rounded-xl border border-slate-800"><table className="w-full bg-slate-900 text-left text-sm">
                        <thead className="bg-slate-950 text-slate-400 uppercase text-xs"><tr><th className="p-4">Symbole</th><th className="p-4 text-right">Prix</th><th className="p-4 text-right">Var.</th><th className="p-4 text-right">Cap.</th></tr></thead>
                        <tbody className="divide-y divide-slate-800">{compareData.map(d => (
                            <tr key={d.symbol}><td className="p-4 font-bold text-blue-400">{d.symbol}</td><td className="p-4 text-right">${d.price?.toFixed(2)}</td><td className={`p-4 text-right ${d.change>=0?'text-green-400':'text-red-400'}`}>{formatSigned(d.changePercent)}%</td><td className="p-4 text-right">{formatNumber(d.mktCap)}</td></tr>
                        ))}</tbody>
                    </table></div>}
                </div>
            )}
        </main>

        {/* AI PANEL */}
        {showAI && (
            <div className="absolute top-0 right-0 w-full md:w-[400px] h-full bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-purple-400"><Sparkles size={18}/> Gemini-Lite</h3>
                    <button onClick={() => setShowAI(false)}><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {aiMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-line ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'}`}>{msg.text}</div>
                        </div>
                    ))}
                    {isAiTyping && <div className="text-slate-500 text-xs ml-4">En train d'écrire...</div>}
                    <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleAiSend} className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2">
                    <input type="text" value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder="Posez une question..." className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2 text-sm focus:border-purple-500 outline-none"/>
                    <button type="submit" disabled={!aiInput.trim()} className="p-2 bg-purple-600 rounded-full text-white"><ArrowRight size={18}/></button>
                </form>
            </div>
        )}
      </div>
    </div>
  );
}