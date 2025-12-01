'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Activity,
  Search,
  Trash2,
  RefreshCw,
  Briefcase,
  Globe,
  BarChart2,
  Layers,
  GitCompare,
  ExternalLink,
  Bot,
  Sparkles,
  ArrowRight,
  Star,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  X,
  Cpu,
  Landmark,
  Car,
  Heart,
  Coins,
} from 'lucide-react';

// --- CONFIGURATION TEMPS ---
const TIME_RANGES = {
  '1J': { label: '1J', range: '1d', interval: '5m' },
  '1S': { label: '1S', range: '1wk', interval: '30m' },
  '1M': { label: '1M', range: '1mo', interval: '1d' },
  '6M': { label: '6M', range: '6mo', interval: '1d' },
  '1A': { label: '1A', range: '1y', interval: '1wk' },
};

// --- LISTE D'ACTIONS PAR SECTEUR (élargie) ---
const MARKET_SECTORS = {
  Technologie: [
    'AAPL',
    'MSFT',
    'NVDA',
    'AMD',
    'AVGO',
    'GOOGL',
    'META',
    'ADBE',
    'ORCL',
    'CRM',
  ],
  Finance: [
    'JPM',
    'BAC',
    'C',
    'GS',
    'MS',
    'WFC',
    'V',
    'MA',
    'AXP',
    'BLK',
  ],
  Auto: ['TSLA', 'F', 'GM', 'TM', 'HMC', 'RACE', 'STLA', 'VWAGY'],
  Santé: ['JNJ', 'PFE', 'LLY', 'MRK', 'ABBV', 'TMO', 'UNH'],
  Crypto: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'DOGE-USD'],
};

const SECTOR_STYLES = {
  Technologie: {
    icon: Cpu,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'hover:border-cyan-500/50',
    gradient: 'from-cyan-500/20',
  },
  Finance: {
    icon: Landmark,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'hover:border-emerald-500/50',
    gradient: 'from-emerald-500/20',
  },
  Auto: {
    icon: Car,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'hover:border-orange-500/50',
    gradient: 'from-orange-500/20',
  },
  Santé: {
    icon: Heart,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'hover:border-pink-500/50',
    gradient: 'from-pink-500/20',
  },
  Crypto: {
    icon: Coins,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'hover:border-purple-500/50',
    gradient: 'from-purple-500/20',
  },
};

// filtres par défaut pour les secteurs
const DEFAULT_SECTOR_FILTERS = {
  sortBy: 'changePercent', // 'price' | 'mktCap' | 'volume' | 'name'
  sortDir: 'desc',
  perf: 'all', // 'all' | 'gainers' | 'losers'
  cap: 'all', // 'all' | 'large' | 'mid' | 'small'
};

const formatNumber = (num) => {
  if (!num && num !== 0) return '-';
  const n = parseFloat(num);
  if (Number.isNaN(n)) return '-';
  if (n >= 1.0e12) return (n / 1.0e12).toFixed(2) + 'T';
  if (n >= 1.0e9) return (n / 1.0e9).toFixed(2) + 'B';
  if (n >= 1.0e6) return (n / 1.0e6).toFixed(2) + 'M';
  return n.toFixed(2);
};

const formatSigned = (num) => {
  if (num === undefined || num === null) return '0.00';
  const n = parseFloat(num);
  if (Number.isNaN(n)) return '0.00';
  return (n > 0 ? '+' : '') + n.toFixed(2);
};

const timeAgo = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp * 1000);
    if (Number.isNaN(date.getTime())) return 'Récemment';
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 3600;
    if (interval > 24) {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      });
    }
    if (interval > 1) return 'Il y a ' + Math.floor(interval) + ' h';
    interval = seconds / 60;
    if (interval > 1) return 'Il y a ' + Math.floor(interval) + ' min';
    return "À l'instant";
  } catch {
    return '';
  }
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
  const [visibleNewsCount, setVisibleNewsCount] = useState(4);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Watchlist & Secteurs
  const [sectorData, setSectorData] = useState([]);
  const [selectedSector, setSelectedSector] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [watchlistData, setWatchlistData] = useState([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);

  // 🔥 Filtres secteur façon TradingView
  const [sectorFilters, setSectorFilters] = useState(DEFAULT_SECTOR_FILTERS);

  // Recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef(null);

  // Comparateur
  const [compareList, setCompareList] = useState(['AAPL', 'MSFT', 'GOOGL']);
  const [compareData, setCompareData] = useState([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // --- IA (manuel / non streaming) ---
  const [showAI, setShowAI] = useState(false);
  const [userText, setUserText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [errorAI, setErrorAI] = useState(null);
  const chatEndRef = useRef(null);

  const handleNonStreamingSubmit = async (e) => {
    e.preventDefault();
    if (!userText.trim() || isLoadingAI) return;

    const textToSend = userText;
    const stockPayload = stockInfo
      ? {
          stockInfo: {
            symbol: stockInfo.symbol,
            price: stockInfo.price,
            changePercent: stockInfo.changePercent,
          },
        }
      : {};

    const userMessage = { id: Date.now(), role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setUserText('');
    setIsLoadingAI(true);
    setErrorAI(null);

    const currentMessages = [...messages, userMessage];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages,
          data: stockPayload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Erreur Serveur HTTP ${response.status}`
        );
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: data.id || 'ai-' + Date.now(),
          role: 'assistant',
          content: data.text || "La réponse de l'IA est vide.",
        },
      ]);
    } catch (err) {
      console.error('Erreur Chat:', err.message);
      setErrorAI({ message: err.message });
    } finally {
      setIsLoadingAI(false);
    }
  };

  useEffect(() => {
    if (showAI) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showAI]);

  // --- DATA STOCKS ---

  const fetchStockData = async (symbol, rangeKey) => {
    setLoading(true);
    setVisibleNewsCount(4);
    setShowFullDescription(false);

    const rangeConfig = TIME_RANGES[rangeKey] || TIME_RANGES['1M'];
    const { range, interval } = rangeConfig;

    try {
      const res = await fetch(
        `/api/stock?symbol=${symbol}&range=${range}&interval=${interval}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStockInfo(data);
      setNews(data.news || []);

      const rawChart = Array.isArray(data.chart) ? data.chart : [];

      const formattedChart = rawChart.map((item) => ({
        timestamp: item.timestamp,
        prix: parseFloat(item.prix.toFixed(2)),
      }));
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

  // Recherche
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
      } catch (e2) {
        console.error(e2);
      }
    }, 300);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if ((searchQuery || '').trim()) {
      const target =
        suggestions.length > 0 ? suggestions[0].symbol : searchQuery.toUpperCase();
      selectSuggestion(target);
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

  const toggleWatchlist = (symbol) => {
    const currentList = Array.isArray(watchlist) ? watchlist : [];
    if (currentList.includes(symbol)) {
      setWatchlist(currentList.filter((s) => s !== symbol));
    } else {
      setWatchlist([...currentList, symbol]);
    }
  };

  const fetchMultipleStocks = async (symbols, targetSetter) => {
    if (!symbols || symbols.length === 0) {
      targetSetter([]);
      return;
    }
    setLoadingList(true);
    const promises = symbols.map((sym) =>
      fetch(`/api/stock?symbol=${sym}&range=1d`)
        .then((r) => r.json())
        .catch(() => null)
    );

    const results = await Promise.all(promises);
    const validResults = results.filter((r) => r && !r.error && r.price);
    targetSetter(validResults);
    setLoadingList(false);
  };

  const fetchWatchlistData = async () => {
    setLoadingWatchlist(true);
    if (!watchlist || watchlist.length === 0) {
      setWatchlistData([]);
      setLoadingWatchlist(false);
      return;
    }

    const promises = watchlist.map((sym) =>
      fetch(`/api/stock?symbol=${sym}&range=1d`)
        .then((r) => r.json())
        .catch(() => null)
    );
    const results = await Promise.all(promises);
    setWatchlistData(results.filter((r) => r && !r.error && r.price));
    setLoadingWatchlist(false);
  };

  useEffect(() => {
    if (activeTab === 'sectors' && selectedSector) {
      fetchMultipleStocks(MARKET_SECTORS[selectedSector], setSectorData);
    }
  }, [selectedSector, activeTab]);

  useEffect(() => {
    if (activeTab === 'watchlist') fetchWatchlistData();
  }, [activeTab, watchlist]);

  const fetchCompareData = async () => {
    setLoadingCompare(true);
    const promises = compareList.map((sym) =>
      fetch(`/api/stock?symbol=${sym}&range=1d`)
        .then((r) => r.json())
        .catch(() => null)
    );
    const results = await Promise.all(promises);
    setCompareData(results.filter((r) => r && !r.error));
    setLoadingCompare(false);
  };

  useEffect(() => {
    if (activeTab === 'compare') fetchCompareData();
  }, [activeTab, compareList]);

  const formatXAxis = (timestamp) => {
    const date = new Date(timestamp);
    if (activeRange === '1J') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (activeRange === '1S' || activeRange === '5J') {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  // 🔥 Haut / Bas de la période affichée
  const { periodHigh, periodLow } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { periodHigh: null, periodLow: null };
    }

    let min = chartData[0].prix;
    let max = chartData[0].prix;

    for (const point of chartData) {
      if (typeof point.prix !== 'number') continue;
      if (point.prix < min) min = point.prix;
      if (point.prix > max) max = point.prix;
    }

    return { periodHigh: max, periodLow: min };
  }, [chartData]);

  // 🔥 Filtres secteur (comme TradingView)
  const filteredSectorData = useMemo(() => {
    let data = [...sectorData];

    // filtre gagnants/perdants
    if (sectorFilters.perf === 'gainers') {
      data = data.filter((d) => d.changePercent > 0);
    } else if (sectorFilters.perf === 'losers') {
      data = data.filter((d) => d.changePercent < 0);
    }

    // filtre par cap boursière
    const getCap = (d) => d.mktCap || d.mktcap || 0;
    if (sectorFilters.cap === 'large') {
      data = data.filter((d) => getCap(d) >= 10e9);
    } else if (sectorFilters.cap === 'mid') {
      data = data.filter((d) => getCap(d) >= 2e9 && getCap(d) < 10e9);
    } else if (sectorFilters.cap === 'small') {
      data = data.filter((d) => getCap(d) > 0 && getCap(d) < 2e9);
    }

    // tri
    const sortKey = sectorFilters.sortBy;
    data.sort((a, b) => {
      if (sortKey === 'name') {
        const av = a.name || '';
        const bv = b.name || '';
        return sectorFilters.sortDir === 'asc'
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }

      const av =
        sortKey === 'changePercent'
          ? a.changePercent ?? 0
          : sortKey === 'price'
          ? a.price ?? 0
          : sortKey === 'mktCap'
          ? getCap(a)
          : sortKey === 'volume'
          ? a.volume ?? 0
          : 0;

      const bv =
        sortKey === 'changePercent'
          ? b.changePercent ?? 0
          : sortKey === 'price'
          ? b.price ?? 0
          : sortKey === 'mktCap'
          ? getCap(b)
          : sortKey === 'volume'
          ? b.volume ?? 0
          : 0;

      return sectorFilters.sortDir === 'asc' ? av - bv : bv - av;
    });

    return data;
  }, [sectorData, sectorFilters]);

  const updateSectorFilter = (key, value) => {
    setSectorFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-30">
        <div className="p-6 text-xl font-bold text-blue-400 flex items-center gap-2">
          <Activity />
          <span className="hidden md:block">CapoStocks</span>
        </div>
        <nav className="flex-1 px-2 space-y-2 mt-4">
          {['dashboard', 'watchlist', 'sectors', 'compare'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'sectors') {
                  setSelectedSector(null);
                  setSectorFilters(DEFAULT_SECTOR_FILTERS);
                }
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
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
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur z-20">
          <form onSubmit={handleSearchSubmit} className="relative w-96 max-w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              placeholder={
                activeTab === 'compare'
                  ? 'Ajouter au comparateur...'
                  : 'Rechercher (ex: Apple)...'
              }
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-12 left-0 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                {suggestions.map((s) => (
                  <div
                    key={s.symbol}
                    onMouseDown={() => selectSuggestion(s.symbol)}
                    className="p-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 flex justify-between items-center group"
                  >
                    <div>
                      <span className="font-bold text-white group-hover:text-blue-400">
                        {s.symbol}
                      </span>
                      <div className="text-xs text-slate-400 truncate w-48">
                        {s.name}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-950 px-2 py-1 rounded">
                      {s.exch}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </form>

          <button
            onClick={() => setShowAI(!showAI)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
              showAI
                ? 'bg-purple-600 border-purple-600 text-white'
                : 'border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {showAI ? (
              <Sparkles size={18} className="animate-pulse" />
            ) : (
              <Bot size={18} />
            )}
            <span className="hidden md:inline font-medium">Assistant</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-950 relative custom-scrollbar">
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && stockInfo && (
            <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
              {/* header titre */}
              <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    {stockInfo.name}{' '}
                    <span className="text-xl text-slate-500">
                      ({stockInfo.symbol})
                    </span>
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
                          watchlist.includes(stockInfo.symbol)
                            ? 'currentColor'
                            : 'none'
                        }
                      />
                    </button>
                  </h1>
                  <div className="flex items-baseline gap-3 mt-1">
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
                      {formatSigned(stockInfo.change)} (
                      {formatSigned(stockInfo.changePercent)}%)
                    </span>
                    <span className="text-xs text-slate-500">
                      Sur {activeRange}
                    </span>
                  </div>
                </div>

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
              </div>

              {/* QUICK STATS */}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
                {/* haut */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-xs text-slate-500">
                    {activeRange === '1J'
                      ? 'Haut du jour'
                      : `Haut (${TIME_RANGES[activeRange]?.label || activeRange})`}
                  </span>
                  <span className="text-sm font-mono">
                    {periodHigh !== null ? `$${periodHigh.toFixed(2)}` : '—'}
                  </span>
                </div>
                {/* bas */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-xs text-slate-500">
                    {activeRange === '1J'
                      ? 'Bas du jour'
                      : `Bas (${TIME_RANGES[activeRange]?.label || activeRange})`}
                  </span>
                  <span className="text-sm font-mono">
                    {periodLow !== null ? `$${periodLow.toFixed(2)}` : '—'}
                  </span>
                </div>
                {/* volume */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-xs text-slate-500">Volume</span>
                  <span className="text-sm font-mono">
                    {stockInfo.volume
                      ? stockInfo.volume.toLocaleString()
                      : '—'}
                  </span>
                </div>
                {/* 52w range */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-xs text-slate-500">52 sem. range</span>
                  <span className="text-xs font-mono">
                    {stockInfo.fiftyTwoWeekLow && stockInfo.fiftyTwoWeekHigh
                      ? `$${stockInfo.fiftyTwoWeekLow.toFixed(
                          2
                        )} – $${stockInfo.fiftyTwoWeekHigh.toFixed(2)}`
                      : '—'}
                  </span>
                </div>
                {/* beta */}
                <div className="hidden xl:flex bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex-col gap-1">
                  <span className="text-xs text-slate-500">Beta (volatilité)</span>
                  <span className="text-sm font-mono">
                    {stockInfo.beta ? stockInfo.beta.toFixed(2) : '—'}
                  </span>
                </div>
              </div>

              {/* CHART */}
              <div className="bg-slate-900 rounded-2xl p-1 border border-slate-800 shadow-xl min-h-[400px]">
                {loading ? (
                  <div className="h-[400px] flex items-center justify-center text-slate-500 animate-pulse">
                    Chargement des données...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart
                      data={chartData}
                      margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorPrice"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={
                              stockInfo.change >= 0 ? '#4ade80' : '#f87171'
                            }
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor={
                              stockInfo.change >= 0 ? '#4ade80' : '#f87171'
                            }
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
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        minTickGap={60}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                      />
                      <YAxis
                        orientation="right"
                        domain={['auto', 'auto']}
                        tick={{ fill: '#64748b', fontSize: 11 }}
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
                        isAnimationActive={true}
                        connectNulls={true}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* FONDAMENTAUX + NEWS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Fondamentaux */}
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 h-fit">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Briefcase size={18} className="text-blue-400" /> Fondamentaux
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-slate-400">Profil</span>
                      <span className="text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-200 font-medium">
                        {stockInfo.peRatio && stockInfo.peRatio > 40
                          ? 'Croissance agressive'
                          : stockInfo.peRatio && stockInfo.peRatio < 15
                          ? 'Value / Décotée'
                          : 'Mixte / Neutre'}
                      </span>
                    </div>
                    <div className="flex justify-between pb-2 border-b border-slate-800">
                      <span className="text-slate-400">Cap. Boursière</span>
                      <span className="font-mono">
                        {formatNumber(stockInfo.mktCap)}
                      </span>
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
                        {stockInfo.targetPrice
                          ? '$' + stockInfo.targetPrice
                          : '-'}
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
                        onClick={() =>
                          setShowFullDescription(!showFullDescription)
                        }
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
                    <Globe size={18} className="text-blue-400" /> Actualités en
                    direct
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
                                  {timeAgo(n.providerPublishTime)}{' '}
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
                              setVisibleNewsCount((prev) =>
                                prev > 4 ? 4 : prev + 4
                              )
                            }
                            className="w-full py-3 mt-4 flex items-center justify-center gap-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors"
                          >
                            {visibleNewsCount > 4 ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                            {visibleNewsCount > 4
                              ? 'Voir moins'
                              : "Charger plus d'actualités"}
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

          {/* WATCHLIST */}
          {activeTab === 'watchlist' && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Star className="text-yellow-400" fill="currentColor" /> Ma
                  Liste de Surveillance
                </h2>
                <button
                  onClick={fetchWatchlistData}
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
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden cursor-pointer hover:border-blue-500 hover:bg-slate-900/90 transition-all group"
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/15 rounded-full blur-3xl" />
                      </div>

                      <div className="relative z-10 flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-2xl font-bold flex items-center gap-2">
                            {data.symbol}
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                              {data.sector || '—'}
                            </span>
                          </h3>
                          <div className="text-sm text-slate-400 truncate w-48">
                            {data.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${data.price?.toFixed(2)}
                          </div>
                          <div
                            className={`text-sm font-medium mt-1 inline-flex items-center px-2 py-0.5 rounded-full ${
                              data.changePercent >= 0
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {data.changePercent >= 0 ? '↑' : '↓'}{' '}
                            {formatSigned(data.changePercent)}%
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(data.symbol);
                        }}
                        className="relative z-10 mt-2 text-xs text-slate-500 hover:text-red-400 flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Retirer de la liste
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTEURS */}
          {activeTab === 'sectors' && (
            <div className="max-w-6xl mx-auto animate-in zoom-in duration-300">
              {selectedSector ? (
                <div>
                  <div className="flex flex-wrap items-center gap-4 mb-6 justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setSelectedSector(null)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-blue-500 transition-all"
                      >
                        <ArrowLeft size={18} /> Retour
                      </button>
                      {(() => {
                        const style =
                          SECTOR_STYLES[selectedSector] ||
                          SECTOR_STYLES['Technologie'];
                        const Icon = style.icon;
                        return (
                          <h2
                            className={`text-3xl font-bold flex items-center gap-3 ${style.color}`}
                          >
                            <Icon size={32} /> {selectedSector}
                          </h2>
                        );
                      })()}
                    </div>

                    {/* mini résumé */}
                    <div className="text-xs text-slate-500 bg-slate-900 px-3 py-2 rounded-full border border-slate-800">
                      {sectorData.length} actions suivies •{' '}
                      {filteredSectorData.length} visibles avec les filtres
                    </div>
                  </div>

                  {/* FILTRES SECTEUR */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
                    {/* tri */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-400 uppercase tracking-wide">
                        Tri :
                      </span>
                      <select
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs outline-none"
                        value={sectorFilters.sortBy}
                        onChange={(e) =>
                          updateSectorFilter('sortBy', e.target.value)
                        }
                      >
                        <option value="changePercent">Performance %</option>
                        <option value="price">Prix</option>
                        <option value="mktCap">Cap. boursière</option>
                        <option value="volume">Volume</option>
                        <option value="name">Nom</option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          updateSectorFilter(
                            'sortDir',
                            sectorFilters.sortDir === 'desc' ? 'asc' : 'desc'
                          )
                        }
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:border-slate-500"
                      >
                        {sectorFilters.sortDir === 'desc' ? '↓' : '↑'}
                        {sectorFilters.sortDir === 'desc'
                          ? 'Desc'
                          : 'Asc'}
                      </button>
                    </div>

                    {/* perf */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-400 uppercase tracking-wide">
                        Performance :
                      </span>
                      {[
                        { key: 'all', label: 'Tous' },
                        { key: 'gainers', label: 'Gagnants' },
                        { key: 'losers', label: 'Perdants' },
                      ].map((b) => (
                        <button
                          key={b.key}
                          type="button"
                          onClick={() => updateSectorFilter('perf', b.key)}
                          className={`px-3 py-1 rounded-full border text-xs ${
                            sectorFilters.perf === b.key
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-700 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>

                    {/* cap boursière */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-400 uppercase tracking-wide">
                        Cap. :
                      </span>
                      <select
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs outline-none"
                        value={sectorFilters.cap}
                        onChange={(e) =>
                          updateSectorFilter('cap', e.target.value)
                        }
                      >
                        <option value="all">Toutes</option>
                        <option value="large">Large (&gt;= 10B)</option>
                        <option value="mid">Mid (2B–10B)</option>
                        <option value="small">Small (&lt; 2B)</option>
                      </select>
                    </div>
                  </div>

                  {loadingList ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <RefreshCw
                        className="animate-spin mb-4 text-blue-500"
                        size={32}
                      />
                      <div className="text-slate-500">
                        Analyse du secteur...
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredSectorData.map((d) => (
                        <div
                          key={d.symbol}
                          onClick={() => {
                            setSelectedStock(d.symbol);
                            setActiveTab('dashboard');
                          }}
                          className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-blue-500 hover:bg-slate-900 transition-all group flex flex-col justify-between h-36 relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                          <div className="flex justify-between items-start z-10">
                            <div>
                              <span className="font-bold text-xl text-white group-hover:text-blue-400 transition-colors">
                                {d.symbol}
                              </span>
                              <div className="text-xs text-slate-500 truncate w-40 mt-1">
                                {d.name}
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`px-2 py-1 rounded-lg text-sm font-bold inline-flex items-center ${
                                  d.changePercent >= 0
                                    ? 'bg-green-500/10 text-green-400'
                                    : 'bg-red-500/10 text-red-400'
                                }`}
                              >
                                {d.changePercent >= 0 ? '↑' : '↓'}{' '}
                                {formatSigned(d.changePercent)}%
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1">
                                Vol: {d.volume ? d.volume.toLocaleString() : '—'}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-end z-10 mt-4">
                            <div className="text-2xl font-bold tracking-tight">
                              ${d.price?.toFixed(2)}
                            </div>
                            <ArrowRight
                              size={18}
                              className="text-slate-600 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold text-white mb-2">
                      Exploration par Secteur
                    </h2>
                    <p className="text-slate-500">
                      Découvrez les opportunités dans les différentes industries.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(MARKET_SECTORS).map(([sector, stocks]) => {
                      const style =
                        SECTOR_STYLES[sector] || SECTOR_STYLES['Technologie'];
                      const Icon = style.icon;
                      return (
                        <div
                          key={sector}
                          onClick={() => {
                            setSelectedSector(sector);
                            setSectorFilters(DEFAULT_SECTOR_FILTERS);
                          }}
                          className={`relative overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl p-6 cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${style.border}`}
                        >
                          <div
                            className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${style.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none`}
                          />
                          <div className="relative z-10">
                            <div
                              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${style.bg} ${style.color} transition-transform group-hover:scale-110 duration-300`}
                            >
                              <Icon size={28} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-white/90">
                              {sector}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {stocks.length} principaux tickers suivis.
                            </p>
                            <div className="flex items-center justify-between mt-8">
                              <span className="text-sm font-medium text-slate-500 bg-slate-950/50 px-3 py-1 rounded-full border border-slate-800 group-hover:border-slate-700 transition-colors">
                                Cliquer pour voir les actions
                              </span>
                              <div className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-700 text-slate-400 group-hover:bg-white group-hover:text-black transition-all duration-300">
                                <ArrowRight size={18} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COMPARATEUR */}
          {activeTab === 'compare' && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
              <div className="flex justify-between mb-6">
                <h2 className="text-2xl font-bold">Comparateur</h2>
                <button onClick={fetchCompareData}>
                  <RefreshCw />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                {compareList.map((s) => (
                  <span
                    key={s}
                    className="bg-slate-800 px-3 py-1 rounded flex items-center gap-2"
                  >
                    {s}{' '}
                    <Trash2
                      size={12}
                      onClick={() =>
                        setCompareList(compareList.filter((x) => x !== s))
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
                          <td className="p-4 font-bold text-blue-400">
                            {d.symbol}
                          </td>
                          <td className="p-4 text-right">
                            ${d.price?.toFixed(2)}
                          </td>
                          <td
                            className={`p-4 text-right ${
                              d.change >= 0
                                ? 'text-green-400'
                                : 'text-red-400'
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
          )}
        </main>

        {/* AI PANEL */}
        {showAI && (
          <div className="absolute top-0 right-0 w-full md:w-[400px] h-full bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h3 className="font-bold text-lg flex items-center gap-2 text-purple-400">
                <Sparkles size={18} /> Gemini-Pro
              </h3>
              <button onClick={() => setShowAI(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {errorAI && (
                <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-xs border border-red-500/50 mb-4">
                  ⚠️ Erreur : {errorAI.message}
                </div>
              )}

              {messages.length === 0 && (
                <div className="text-center text-slate-500 mt-10 text-sm">
                  <Bot className="mx-auto mb-3 text-slate-600" size={40} />
                  <p>Je suis prêt à analyser {stockInfo?.symbol || 'le marché'}.</p>
                  <p>Pose-moi une question !</p>
                </div>
              )}

              {(messages || []).map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-line ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {m.role === 'assistant' && (
                      <span className="font-bold text-purple-400 block mb-1 text-xs">
                        IA
                      </span>
                    )}
                    {m.content}
                  </div>
                </div>
              ))}

              {isLoadingAI && (
                <div className="text-slate-500 text-xs ml-4 animate-pulse flex items-center gap-2">
                  <Sparkles size={12} /> Analyse en cours...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form
              onSubmit={handleNonStreamingSubmit}
              className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2"
            >
              <input
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                placeholder="Posez une question..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2 text-sm focus:border-purple-500 outline-none"
              />
              <button
                type="submit"
                disabled={isLoadingAI || !userText.trim()}
                className="p-2 bg-purple-600 rounded-full text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
              >
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
