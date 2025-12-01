'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import DashboardTab from '@/components/dashboard/DashboardTab';
import WatchlistTab from '@/components/watchlist/WatchlistTab';
import SectorsTab from '@/components/sectors/SectorsTab';
import CompareTab from '@/components/compare/CompareTab';
import AiPanel from '@/components/ai/AiPanel';

// --- CONFIGURATION ---

const TIME_RANGES = {
  '1J': { label: '1J', range: '1d', interval: '5m' },
  '1S': { label: '1S', range: '1wk', interval: '30m' },
  '1M': { label: '1M', range: '1mo', interval: '1d' },
  '6M': { label: '6M', range: '6mo', interval: '1d' },
  '1A': { label: '1A', range: '1y', interval: '1wk' },
};

const MARKET_SECTORS = {
  Crypto: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'DOGE-USD', 'XRP-USD', 'ADA-USD'],
};

const FINNHUB_SECTOR_MAP = {
  Technologie: 'technology',
  Finance: 'finance',
  Auto: 'auto',
  Santé: 'healthcare',
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

  const [rangeHigh, setRangeHigh] = useState(null);
  const [rangeLow, setRangeLow] = useState(null);
  const [volumeTotal, setVolumeTotal] = useState(null);

  // Watchlist & Secteurs
  const [sectorData, setSectorData] = useState([]);
  const [selectedSector, setSelectedSector] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [watchlistData, setWatchlistData] = useState([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);

  const [sectorMinMktCap, setSectorMinMktCap] = useState(0);
  const [sectorSortBy, setSectorSortBy] = useState('mktCap');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef(null);

  // Compare
  const [compareList, setCompareList] = useState(['AAPL', 'MSFT', 'GOOGL']);
  const [compareData, setCompareData] = useState([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // IA
  const [showAI, setShowAI] = useState(false);
  const [userText, setUserText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [errorAI, setErrorAI] = useState(null);
  const chatEndRef = useRef(null);

  // --- IA ---

  const handleNonStreamingSubmit = async (e) => {
    e.preventDefault();
    if (!userText.trim() || isLoadingAI) return;

    const textToSend = userText.trim();

    const stockPayload = stockInfo
      ? {
          stockInfo: {
            symbol: stockInfo.symbol,
            price: stockInfo.price,
            changePercent: stockInfo.changePercent,
          },
        }
      : {};

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    setUserText('');
    setIsLoadingAI(true);
    setErrorAI(null);

    const currentMessages = [...messages, userMessage];

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages,
          data: stockPayload,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Erreur Serveur HTTP ${res.status}`);
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: data.id || 'ai-' + Date.now(),
          role: 'assistant',
          content: data.text || "La réponse de l'IA est vide.",
        },
      ]);
    } catch (err) {
      console.error('Erreur Chat:', err);
      setErrorAI({ message: err.message });
    } finally {
      setIsLoadingAI(false);
    }
  };

  useEffect(() => {
    if (showAI) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showAI]);

  // --- FETCH STOCK DATA ---

  const fetchStockData = async (symbol, rangeKey) => {
    setLoading(true);
    setVisibleNewsCount(4);
    setShowFullDescription(false);

    const rangeConfig = TIME_RANGES[rangeKey] || TIME_RANGES['1M'];
    const { range, interval } = rangeConfig;

    try {
      const res = await fetch(
        `/api/stock?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur API /api/stock');

      setStockInfo(data);
      setNews(data.news || []);

      const rawChart = Array.isArray(data.chart) ? data.chart : [];

      if (rawChart.length > 0) {
        let high = -Infinity;
        let low = Infinity;
        let vol = 0;
        rawChart.forEach((row) => {
          if (row.prix !== null && row.prix !== undefined) {
            if (row.prix > high) high = row.prix;
            if (row.prix < low) low = row.prix;
          }
          if (row.volume) vol += row.volume;
        });
        setRangeHigh(high === -Infinity ? null : high);
        setRangeLow(low === Infinity ? null : low);
        setVolumeTotal(vol || null);
      } else {
        setRangeHigh(null);
        setRangeLow(null);
        setVolumeTotal(null);
      }

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
    if (activeTab === 'dashboard') {
      fetchStockData(selectedStock, activeRange);
    }
  }, [selectedStock, activeRange, activeTab]);

  // --- SEARCH ---

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
        const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSuggestions(data.results || []);
        setShowSuggestions(true);
      } catch (err) {
        console.error(err);
      }
    }, 300);
  };

  const selectSuggestion = (symbol) => {
    if (activeTab === 'compare') {
      if (!compareList.includes(symbol)) {
        setCompareList((prev) => [...prev, symbol]);
      }
    } else {
      setSelectedStock(symbol);
      setActiveTab('dashboard');
    }
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if ((searchQuery || '').trim()) {
      const target =
        suggestions.length > 0 ? suggestions[0].symbol : searchQuery.toUpperCase();
      selectSuggestion(target);
    }
  };

  // --- WATCHLIST ---

  const toggleWatchlist = (symbol) => {
    setWatchlist((currentList) => {
      const list = Array.isArray(currentList) ? currentList : [];
      if (list.includes(symbol)) {
        return list.filter((s) => s !== symbol);
      }
      return [...list, symbol];
    });
  };

  const fetchWatchlistData = async () => {
    setLoadingWatchlist(true);

    if (!watchlist || watchlist.length === 0) {
      setWatchlistData([]);
      setLoadingWatchlist(false);
      return;
    }

    const promises = watchlist.map((sym) =>
      fetch(`/api/stock?symbol=${encodeURIComponent(sym)}&range=1d`)
        .then((r) => r.json())
        .catch(() => null)
    );

    const results = await Promise.all(promises);
    setWatchlistData(
      results.filter((r) => r && !r.error && (r.price || r.price === 0))
    );
    setLoadingWatchlist(false);
  };

  useEffect(() => {
    if (activeTab === 'watchlist') {
      fetchWatchlistData();
    }
  }, [activeTab, watchlist]);

  // --- SECTORS ---

  const fetchMultipleStocks = async (symbols, targetSetter) => {
    if (!symbols || symbols.length === 0) {
      targetSetter([]);
      return;
    }

    const promises = symbols.map((sym) =>
      fetch(`/api/stock?symbol=${encodeURIComponent(sym)}&range=1d`)
        .then((r) => r.json())
        .catch(() => null)
    );

    const results = await Promise.all(promises);
    const validResults = results.filter(
      (r) => r && !r.error && (r.price || r.price === 0)
    );
    targetSetter(validResults);
  };

  const loadSectorFromFinnhub = async (sectorLabel) => {
    setLoadingList(true);
    try {
      const fhKey = FINNHUB_SECTOR_MAP[sectorLabel] || 'technology';

      const params = new URLSearchParams({
        sector: fhKey,
        limit: '80',
        minMktCap: '0',
      });

      const res = await fetch(`/api/finnhub-sector?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        console.error('Erreur /api/finnhub-sector:', data.error);
        setSectorData([]);
        return;
      }

      const symbols = (data.stocks || []).map((s) => s.symbol);

      if (symbols.length === 0) {
        setSectorData([]);
        return;
      }

      const promises = symbols.map((sym) =>
        fetch(`/api/stock?symbol=${encodeURIComponent(sym)}&range=1d`)
          .then((r) => r.json())
          .catch(() => null)
      );

      const details = await Promise.all(promises);

      const enriched = details
        .map((d) => (d && !d.error ? d : null))
        .filter(Boolean);

      setSectorData(enriched);
    } catch (err) {
      console.error('Erreur sector Finnhub:', err);
      setSectorData([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sectors' && selectedSector) {
      if (selectedSector === 'Crypto') {
        fetchMultipleStocks(MARKET_SECTORS.Crypto, setSectorData);
      } else {
        loadSectorFromFinnhub(selectedSector);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSector, activeTab]);

  const filteredSectorData = useMemo(() => {
    let data = [...sectorData];

    if (sectorMinMktCap > 0) {
      data = data.filter((d) => (d.mktCap || 0) >= sectorMinMktCap);
    }

    data.sort((a, b) => {
      if (sectorSortBy === 'mktCap') {
        return (b.mktCap || 0) - (a.mktCap || 0);
      }
      if (sectorSortBy === 'changePercent') {
        return (b.changePercent || 0) - (a.changePercent || 0);
      }
      if (sectorSortBy === 'price') {
        return (b.price || 0) - (a.price || 0);
      }
      return 0;
    });

    return data;
  }, [sectorData, sectorMinMktCap, sectorSortBy]);

  // --- COMPARE ---

  const fetchCompareData = async () => {
    setLoadingCompare(true);

    const promises = compareList.map((sym) =>
      fetch(`/api/stock?symbol=${encodeURIComponent(sym)}&range=1d`)
        .then((r) => r.json())
        .catch(() => null)
    );

    const results = await Promise.all(promises);

    setCompareData(results.filter((r) => r && !r.error));
    setLoadingCompare(false);
  };

  useEffect(() => {
    if (activeTab === 'compare') {
      fetchCompareData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, compareList]);

  // --- RENDER ---

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSelectedSector={setSelectedSector}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header
          activeTab={activeTab}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          suggestions={suggestions}
          onSelectSuggestion={selectSuggestion}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          showAI={showAI}
          toggleAI={() => setShowAI((v) => !v)}
        />

        <main className="flex-1 overflow-y-auto p-6 bg-slate-950 relative custom-scrollbar">
          {activeTab === 'dashboard' && stockInfo && (
            <DashboardTab
              stockInfo={stockInfo}
              watchlist={watchlist}
              toggleWatchlist={toggleWatchlist}
              activeRange={activeRange}
              setActiveRange={setActiveRange}
              TIME_RANGES={TIME_RANGES}
              rangeHigh={rangeHigh}
              rangeLow={rangeLow}
              volumeTotal={volumeTotal}
              chartData={chartData}
              loading={loading}
              news={news}
              visibleNewsCount={visibleNewsCount}
              setVisibleNewsCount={setVisibleNewsCount}
              showFullDescription={showFullDescription}
              setShowFullDescription={setShowFullDescription}
            />
          )}

          {activeTab === 'watchlist' && (
            <WatchlistTab
              watchlistData={watchlistData}
              loadingWatchlist={loadingWatchlist}
              onRefresh={fetchWatchlistData}
              setSelectedStock={setSelectedStock}
              setActiveTab={setActiveTab}
              toggleWatchlist={toggleWatchlist}
            />
          )}

          {activeTab === 'sectors' && (
            <SectorsTab
              selectedSector={selectedSector}
              setSelectedSector={setSelectedSector}
              loadingList={loadingList}
              filteredSectorData={filteredSectorData}
              sectorMinMktCap={sectorMinMktCap}
              setSectorMinMktCap={setSectorMinMktCap}
              sectorSortBy={sectorSortBy}
              setSectorSortBy={setSectorSortBy}
              setSelectedStock={setSelectedStock}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'compare' && (
            <CompareTab
              compareList={compareList}
              setCompareList={setCompareList}
              compareData={compareData}
              loadingCompare={loadingCompare}
              fetchCompareData={fetchCompareData}
            />
          )}
        </main>

        {showAI && (
          <AiPanel
            showAI={showAI}
            setShowAI={setShowAI}
            messages={messages}
            errorAI={errorAI}
            isLoadingAI={isLoadingAI}
            userText={userText}
            setUserText={setUserText}
            handleSubmit={handleNonStreamingSubmit}
            chatEndRef={chatEndRef}
            stockInfo={stockInfo}
          />
        )}
      </div>
    </div>
  );
}
