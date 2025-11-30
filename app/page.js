'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, TrendingUp, TrendingDown, Search, Plus, Trash2, RefreshCw, Briefcase, Globe, BarChart2, Layers, GitCompare, ExternalLink, MessageSquare, X, Send
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStock, setSelectedStock] = useState('NVDA'); 
  const [watchlist, setWatchlist] = useState(['AAPL', 'NVDA', 'TSLA', 'AMZN']);
  
  // États Dashboard
  const [activeRange, setActiveRange] = useState('1M');
  const [stockInfo, setStockInfo] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);

  // États Recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef(null);

  // États Assistant IA
  const [showAI, setShowAI] = useState(false);
  const [aiMessages, setAiMessages] = useState([{ role: 'ai', text: 'Bonjour ! Je suis votre assistant financier. Posez-moi une question sur le marché.' }]);
  const [aiInput, setAiInput] = useState('');

  // 1. CHARGEMENT DONNÉES
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

  // 2. RECHERCHE INTELLIGENTE
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.length < 2) { setSuggestions([]); return; }

    searchTimeout.current = setTimeout(async () => {
        const res = await fetch(`/api/search?q=${val}`);
        const data = await res.json();
        setSuggestions(data.results || []);
        setShowSuggestions(true);
    }, 400);
  };

  const selectSuggestion = (symbol) => {
    setSelectedStock(symbol);
    setActiveTab('dashboard');
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // 3. ASSISTANT IA (Simulation)
  const handleAiSend = (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    
    // Ajout message utilisateur
    const userMsg = { role: 'user', text: aiInput };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');

    // Réponse simulée (Pour une vraie IA, il faudrait connecter OpenAI ici)
    setTimeout(() => {
        let responseText = "Je peux vous aider à analyser ce titre. Regardez le ratio P/E et les volumes récents.";
        if (aiInput.toLowerCase().includes('acheter')) responseText = "Je ne peux pas donner de conseil financier direct, mais la tendance actuelle semble " + (stockInfo?.change >= 0 ? "positive." : "négative.");
        if (aiInput.toLowerCase().includes('analyse')) responseText = `L'action ${selectedStock} est dans le secteur ${stockInfo?.sector}. Sa capitalisation est de ${formatNumber(stockInfo?.mktCap)}.`;
        
        setAiMessages(prev => [...prev, { role: 'ai', text: responseText }]);
    }, 1000);
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
            <button onClick={() => setActiveTab('sectors')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${activeTab==='sectors' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <Layers size={20} /> <span className="hidden md:block">Marché</span>
            </button>
        </nav>

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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur z-20">
            <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                    type="text" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Rechercher une action (ex: Tesla)..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => setShowSuggestions(true)}
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
            </div>
            
            <button 
                onClick={() => setShowAI(!showAI)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${showAI ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-700 text-slate-400 hover:text-white'}`}
            >
                <MessageSquare size={18} /> <span>Assistant IA</span>
            </button>
        </header>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950 relative">
            
            {activeTab === 'dashboard' && stockInfo && (
                <div className="space-y-6 max-w-7xl mx-auto pb-20">
                    
                    {/* En-tête Stock */}
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

                    {/* GRAPHIQUE */}
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

                    {/* DÉTAILS COMPLETS & NEWS */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Carte Infos Détaillées */}
                        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Briefcase size={18} className="text-blue-400"/> Fondamentaux</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">Cap. Boursière</span> <span>{formatNumber(stockInfo.mktCap)}</span></div>
                                <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">P/E Ratio</span> <span>{stockInfo.peRatio?.toFixed(2) || '-'}</span></div>
                                <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">Prix Cible (1A)</span> <span className="text-green-400">{stockInfo.targetPrice ? '$'+stockInfo.targetPrice : '-'}</span></div>
                                <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">Volume</span> <span>{formatNumber(stockInfo.volume)}</span></div>
                                <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">Secteur</span> <span className="text-right truncate w-32">{stockInfo.sector}</span></div>
                            </div>
                            <div className="mt-4 pt-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Description</h4>
                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
                                    {stockInfo.description}
                                </p>
                            </div>
                        </div>

                        {/* Carte Vraies Actualités */}
                        <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 border border-slate-800">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Globe size={18} className="text-blue-400"/> Actualités en direct</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {news.length > 0 ? news.map((n) => (
                                    <a key={n.uuid} href={n.link} target="_blank" rel="noreferrer" className="block bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-blue-500 transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-blue-400">{n.publisher}</span>
                                            <ExternalLink size={12} className="text-slate-600 group-hover:text-blue-400"/>
                                        </div>
                                        <h4 className="text-sm font-medium text-slate-200 mb-2 line-clamp-2">{n.title}</h4>
                                        <p className="text-xs text-slate-500">{new Date(n.providerPublishTime * 1000).toLocaleString()}</p>
                                    </a>
                                )) : (
                                    <div className="col-span-2 text-center py-10 text-slate-500">Aucune actualité récente trouvée pour ce titre.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VUE SECTEURS */}
            {activeTab === 'sectors' && (
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl font-bold mb-6">Explorer par Secteur</h2>
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

        </main>

        {/* PANNEAU ASSISTANT IA (Overlay) */}
        {showAI && (
            <div className="absolute top-0 right-0 w-full md:w-96 h-full bg-slate-900 border-l border-slate-800 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-purple-400"><MessageSquare size={20}/> Assistant IA</h3>
                    <button onClick={() => setShowAI(false)} className="hover:text-white text-slate-500"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {aiMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleAiSend} className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2">
                    <input 
                        type="text" 
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        placeholder="Posez une question..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-purple-500"
                    />
                    <button type="submit" className="p-2 bg-purple-600 rounded-full hover:bg-purple-500 transition-colors"><Send size={18}/></button>
                </form>
            </div>
        )}

      </div>
    </div>
  );
}