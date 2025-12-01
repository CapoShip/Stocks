'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Cpu,
  Landmark,
  Car,
  Heart,
  Coins,
  Dice5,
  RefreshCw,
} from 'lucide-react';

// ---------- Config Gamble ----------

const MIN_GAMBLE_UPSIDE = 100;   // % minimum (100 = x2)
const MAX_GAMBLE_RESULTS = 120;  // max actions affichées

// ---------- Helpers ----------

const formatNumber = (num) => {
  if (num === null || num === undefined) return '-';
  const n = Number(num);
  if (Number.isNaN(n)) return '-';
  if (n >= 1.0e12) return (n / 1.0e12).toFixed(2) + 'T';
  if (n >= 1.0e9) return (n / 1.0e9).toFixed(2) + 'B';
  if (n >= 1.0e6) return (n / 1.0e6).toFixed(2) + 'M';
  return n.toFixed(2);
};

const formatSigned = (num) => {
  if (num === null || num === undefined) return '0.00';
  const n = Number(num);
  if (Number.isNaN(n)) return '0.00';
  return (n > 0 ? '+' : '') + n.toFixed(2);
};

// ---------- Crypto (liste statique) ----------

const CRYPTO_TICKERS = [
  'BTC-USD',
  'ETH-USD',
  'SOL-USD',
  'DOGE-USD',
  'XRP-USD',
  'ADA-USD',
];

const ALL_SECTORS = ['Technologie', 'Finance', 'Auto', 'Santé', 'Crypto', 'Gamble'];

// ---------- Fallbacks (si /api/all-tickers foire) ----------

const FALLBACK_SECTOR_TICKERS = {
  Technologie: [
    'AAPL', 'MSFT', 'NVDA', 'AMD', 'AVGO', 'META', 'GOOGL', 'AMZN', 'ADBE',
    'TSM', 'CRM', 'SNOW', 'INTC', 'PLTR',
  ],
  Finance: [
    'JPM', 'BAC', 'GS', 'MS', 'WFC', 'BLK', 'MA', 'V', 'COIN', 'HOOD',
    'SOFI', 'UPST', 'AFRM', 'SQ', 'PYPL',
  ],
  Auto: [
    'TSLA', 'F', 'GM', 'RIVN', 'LCID', 'NIO', 'TM', 'HMC', 'XPEV',
  ],
  Santé: [
    'UNH', 'LLY', 'PFE', 'MRNA', 'VRTX', 'JNJ', 'ISRG', 'REGN', 'BMY',
  ],
};

// tickers "risqués" pour Gamble (fallback + universe de base)
const GAMBLE_CANDIDATES = [
  'MARA',
  'RBLX',
  'COIN',
  'LCID',
  'DKNG',
  'AFRM',
  'CLOV',
  'UPST',
  'HOOD',
  'PLTR',
  'SOFI',
  'RIVN',
  'DNA',
  'RIOT',
  'IONQ',
];

// Styles par secteur
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
  Gamble: {
    icon: Dice5,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'hover:border-yellow-500/50',
    gradient: 'from-yellow-500/20',
  },
};

// ---------- Matching Yahoo -> secteur custom ----------

function matchesSector(label, yahooSector = '', yahooIndustry = '') {
  const sector = (yahooSector || '').toLowerCase();
  const industry = (yahooIndustry || '').toLowerCase();

  switch (label) {
    case 'Technologie':
      return (
        sector.includes('technology') ||
        sector.includes('communication services') ||
        industry.includes('semiconductor') ||
        industry.includes('software') ||
        industry.includes('it services')
      );

    case 'Finance':
      return (
        sector.includes('financial') ||
        industry.includes('bank') ||
        industry.includes('insurance') ||
        industry.includes('credit services') ||
        industry.includes('capital markets')
      );

    case 'Auto':
      return (
        industry.includes('auto') ||
        industry.includes('automobile') ||
        industry.includes('vehicle') ||
        industry.includes('electric vehicles') ||
        industry.includes('auto manufacturers') ||
        (sector.includes('consumer cyclical') &&
          (industry.includes('auto') || industry.includes('vehicle')))
      );

    case 'Santé':
      return sector.includes('healthcare') || industry.includes('health');

    default:
      return false;
  }
}

// ---------- Composant ----------

export default function SectorsTab({ onSelectStock }) {
  const [selectedSector, setSelectedSector] = useState(null);

  const [allTickers, setAllTickers] = useState([]);
  const [allTickersLoading, setAllTickersLoading] = useState(false);
  const [allTickersError, setAllTickersError] = useState(null);

  const [sectorData, setSectorData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [sectorMinMktCap, setSectorMinMktCap] = useState(0);
  const [sectorSortBy, setSectorSortBy] = useState('mktCap');

  // --------- /api/all-tickers : renvoie la LISTE directement ---------

  const fetchAllTickers = async () => {
    if (allTickers.length > 0) return allTickers;

    setAllTickersLoading(true);
    setAllTickersError(null);

    try {
      const res = await fetch('/api/all-tickers?count=5000');
      const data = await res.json();

      let list = [];
      if (Array.isArray(data.tickers)) list = data.tickers;
      else if (Array.isArray(data.symbols)) list = data.symbols;
      else if (Array.isArray(data)) list = data;

      // si l’API renvoie rien → on renvoie au moins tous les tickers de fallback
      if (!list || list.length === 0) {
        const set = new Set(
          Object.values(FALLBACK_SECTOR_TICKERS).flat().concat(GAMBLE_CANDIDATES)
        );
        list = Array.from(set);
      }

      setAllTickers(list);
      return list;
    } catch (e) {
      console.error('Erreur /api/all-tickers:', e);
      setAllTickersError(e.message || 'Erreur all-tickers');

      const set = new Set(
        Object.values(FALLBACK_SECTOR_TICKERS).flat().concat(GAMBLE_CANDIDATES)
      );
      const list = Array.from(set);
      setAllTickers(list);
      return list;
    } finally {
      setAllTickersLoading(false);
    }
  };

  // --------- /api/stock pour une liste ---------

  const fetchMultipleStocks = async (symbols) => {
    if (!symbols || symbols.length === 0) return [];

    const BATCH_SIZE = 40;
    const result = [];

    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map((sym) =>
          fetch(`/api/stock?symbol=${encodeURIComponent(sym)}&range=1d`)
            .then((r) => r.json())
            .catch(() => null)
        )
      );

      batchResults.forEach((r) => {
        if (r && !r.error && (r.price || r.price === 0)) {
          result.push(r);
        }
      });
    }

    return result;
  };

  // --------- Secteurs classiques via ALL TICKERS + fallback ----------

  const loadSectorFromAllTickers = async (label) => {
    setLoading(true);
    setSectorData([]);

    try {
      const symbols = await fetchAllTickers();

      // si liste globale vide => on tombe sur le fallback direct
      if (!symbols || symbols.length === 0) {
        const fallback = FALLBACK_SECTOR_TICKERS[label] || [];
        const data = await fetchMultipleStocks(fallback);
        setSectorData(data);
        return;
      }

      const BATCH_SIZE = 40;
      const collected = [];

      for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        const batch = symbols.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
          batch.map((sym) =>
            fetch(`/api/stock?symbol=${encodeURIComponent(sym)}&range=1d`)
              .then((r) => r.json())
              .catch(() => null)
          )
        );

        batchResults.forEach((r) => {
          if (!r || r.error) return;
          if (!matchesSector(label, r.sector, r.industry)) return;
          if (!(r.price || r.price === 0)) return;
          collected.push(r);
        });
      }

      // si l’algorithme auto ne trouve rien → fallback sur la liste fixe
      if (collected.length === 0) {
        const fallback = FALLBACK_SECTOR_TICKERS[label] || [];
        const data = await fetchMultipleStocks(fallback);
        setSectorData(data);
      } else {
        setSectorData(collected);
      }
    } catch (e) {
      console.error('Erreur loadSectorFromAllTickers:', e);
      const fallback = FALLBACK_SECTOR_TICKERS[label] || [];
      const data = await fetchMultipleStocks(fallback);
      setSectorData(data);
    } finally {
      setLoading(false);
    }
  };

  // --------- Crypto ----------

  const loadCrypto = async () => {
    setLoading(true);
    setSectorData([]);
    try {
      const data = await fetchMultipleStocks(CRYPTO_TICKERS);
      setSectorData(data);
    } catch (e) {
      console.error('Erreur loadCrypto:', e);
      setSectorData([]);
    } finally {
      setLoading(false);
    }
  };

  // --------- Gamble : ALL TICKERS + upside >= MIN_GAMBLE_UPSIDE + fallback ----------

  const loadGamble = async () => {
    setLoading(true);
    setSectorData([]);

    try {
      const symbolsGlobal = await fetchAllTickers();
      const symbols =
        symbolsGlobal && symbolsGlobal.length > 0
          ? symbolsGlobal
          : GAMBLE_CANDIDATES;

      const BATCH_SIZE = 40;
      const collected = [];

      for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        const batch = symbols.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
          batch.map((sym) =>
            fetch(`/api/stock?symbol=${encodeURIComponent(sym)}&range=1d`)
              .then((r) => r.json())
              .catch(() => null)
          )
        );

        batchResults.forEach((d) => {
          if (!d || d.error) return;
          if (!d.price || !d.targetPrice) return;
          if (d.targetPrice <= d.price) return;

          const upside = ((d.targetPrice - d.price) / d.price) * 100;
          if (upside >= MIN_GAMBLE_UPSIDE) {
            collected.push({ ...d, upside });
          }
        });
      }

      collected.sort((a, b) => (b.upside || 0) - (a.upside || 0));

      if (collected.length === 0) {
        // si vraiment rien >= 100% → on montre quand même les candidats avec leur upside
        const data = await fetchMultipleStocks(GAMBLE_CANDIDATES);
        const withUpside = data
          .map((d) => {
            if (!d.price || !d.targetPrice || d.targetPrice <= d.price)
              return null;
            const upside = ((d.targetPrice - d.price) / d.price) * 100;
            return { ...d, upside };
          })
          .filter(Boolean)
          .sort((a, b) => (b.upside || 0) - (a.upside || 0));
        setSectorData(withUpside.slice(0, MAX_GAMBLE_RESULTS));
      } else {
        setSectorData(collected.slice(0, MAX_GAMBLE_RESULTS));
      }
    } catch (e) {
      console.error('Erreur loadGamble:', e);
      setSectorData([]);
    } finally {
      setLoading(false);
    }
  };

  // --------- Réagit au secteur sélectionné ----------

  useEffect(() => {
    if (!selectedSector) return;

    if (selectedSector === 'Crypto') {
      loadCrypto();
    } else if (selectedSector === 'Gamble') {
      loadGamble();
    } else {
      loadSectorFromAllTickers(selectedSector);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSector]);

  // --------- Filtres / tri ----------

  const filteredSectorData = useMemo(() => {
    let data = [...sectorData];

    if (
      selectedSector !== 'Crypto' &&
      selectedSector !== 'Gamble' &&
      sectorMinMktCap > 0
    ) {
      data = data.filter((d) => (d.mktCap || 0) >= sectorMinMktCap);
    }

    if (selectedSector === 'Gamble') {
      return data; // déjà trié par upside
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
  }, [sectorData, sectorMinMktCap, sectorSortBy, selectedSector]);

  // ==================== RENDER ====================

  // Vue liste de secteurs
  if (!selectedSector) {
    return (
      <div className="max-w-6xl mx-auto animate-in zoom-in duration-300">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-2">
            Exploration par Secteur
          </h2>
          <p className="text-slate-500">
            Découvrez les opportunités dans les différentes industries.
          </p>
        </div>

        {allTickersLoading && (
          <div className="text-xs text-slate-500 mb-4 text-center">
            Pré-chargement des tickers en cours...
          </div>
        )}
        {allTickersError && (
          <div className="text-xs text-red-400 mb-4 text-center">
            Erreur all-tickers: {allTickersError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ALL_SECTORS.map((sector) => {
            const style = SECTOR_STYLES[sector] || SECTOR_STYLES.Technologie;
            const Icon = style.icon;
            return (
              <div
                key={sector}
                onClick={() => setSelectedSector(sector)}
                className={`relative overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl p-6 cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${style.border}`}
              >
                <div
                  className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${style.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none`}
                ></div>

                <div className="relative z-10">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${style.bg} ${style.color} transition-transform group-hover:scale-110 duration-300`}
                  >
                    <Icon size={28} />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-white/90">
                    {sector}
                  </h3>
                  <div className="flex items-center justify-between mt-8">
                    <span className="text-sm font-medium text-slate-500 bg-slate-950/50 px-3 py-1 rounded-full border border-slate-800 group-hover:border-slate-700 transition-colors">
                      {sector === 'Gamble'
                        ? 'Actions avec prix cible beaucoup plus haut que le prix actuel'
                        : sector === 'Crypto'
                        ? 'Principales cryptos spot'
                        : 'Actions du secteur (scan + fallback)'}
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
    );
  }

  // Vue détail d'un secteur

  const style = SECTOR_STYLES[selectedSector] || SECTOR_STYLES.Technologie;
  const Icon = style.icon;

  return (
    <div className="max-w-6xl mx-auto animate-in zoom-in duration-300">
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button
          onClick={() => {
            setSelectedSector(null);
            setSectorData([]);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-blue-500 transition-all"
        >
          <ArrowLeft size={18} /> Retour
        </button>

        <h2
          className={`text-3xl font-bold flex items-center gap-3 ${style.color}`}
        >
          <Icon size={32} /> {selectedSector}
        </h2>
      </div>

      {selectedSector !== 'Crypto' && selectedSector !== 'Gamble' && (
        <div className="flex flex-wrap gap-4 mb-6 items-center">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Cap. boursière min :</span>
            <select
              value={sectorMinMktCap}
              onChange={(e) => setSectorMinMktCap(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value={0}>Toutes</option>
              <option value={2e9}>&gt; 2B</option>
              <option value={1e10}>&gt; 10B</option>
              <option value={1e11}>&gt; 100B</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Trier par :</span>
            <select
              value={sectorSortBy}
              onChange={(e) => setSectorSortBy(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="mktCap">Cap. boursière</option>
              <option value="price">Prix</option>
              <option value="changePercent">Variation %</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="animate-spin mb-4 text-blue-500" size={32} />
          <div className="text-slate-500">
            Scan du secteur via Yahoo en cours...
          </div>
        </div>
      ) : filteredSectorData.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-slate-900/60 border border-slate-800 rounded-2xl">
          Aucune action trouvée (soit pas de données, soit aucune ne respecte
          les critères).
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSectorData.map((d) => {
            const upsideLabel =
              selectedSector === 'Gamble' && d.upside != null
                ? `Potentiel cible: ${d.upside > 0 ? '+' : ''}${d.upside.toFixed(
                    0
                  )}%`
                : null;

            return (
              <div
                key={d.symbol}
                onClick={() => onSelectStock && onSelectStock(d.symbol)}
                className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-blue-500 hover:bg-slate-900 transition-all group flex flex-col justify-between h-32 relative overflow-hidden"
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
                    {upsideLabel && (
                      <div className="mt-1 inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/40">
                        {upsideLabel}
                      </div>
                    )}
                  </div>
                  <div
                    className={`px-2 py-1 rounded-lg text-sm font-bold ${
                      d.changePercent >= 0
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {formatSigned(d.changePercent)}%
                  </div>
                </div>
                <div className="flex justify-between items-end z-10">
                  <div className="text-2xl font-bold tracking-tight">
                    ${d.price?.toFixed(2)}
                  </div>
                  <ArrowRight
                    size={18}
                    className="text-slate-600 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
