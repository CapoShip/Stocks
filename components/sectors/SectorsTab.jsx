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
import { formatNumber, formatSigned } from '@/lib/formatters';

// ------------------
// 1) LISTES PAR SECTEUR (tout statique)
// ------------------

// Tu peux modifier ces listes comme tu veux
const STATIC_SECTORS = {
  Technologie: [
    'AAPL',
    'MSFT',
    'NVDA',
    'GOOGL',
    'META',
    'AVGO',
    'ASML',
    'ADBE',
    'TSM',
    'CRM',
    'INTC',
    'AMD',
  ],
  Finance: [
    'JPM',
    'BAC',
    'GS',
    'MS',
    'WFC',
    'HSBC',
    'C',
    'AXP',
    'SCHW',
    'BLK',
  ],
  Auto: [
    'TSLA',
    'F',
    'GM',
    'TM',
    'HMC',
    'RIVN',
    'LCID',
    'STLA',
    'VWAGY',
  ],
  Santé: [
    'LLY',
    'JNJ',
    'PFE',
    'MRK',
    'UNH',
    'ABT',
    'TMO',
    'VRTX',
    'REGN',
    'BMY',
  ],
  Crypto: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'DOGE-USD', 'XRP-USD', 'ADA-USD'],

  // Secteur Gamble = actions "casino"
  // -> plein de titres avec des targetPrice très au-dessus du prix actuel
  Gamble: [
    'SOFI',
    'PLTR',
    'AFRM',
    'HOOD',
    'COIN',
    'MARA',
    'RIVN',
    'LCID',
    'RBLX',
    'DKNG',
    'CLOV',
    'UPST',
  ],
};

const ALL_SECTORS = [
  'Technologie',
  'Finance',
  'Auto',
  'Santé',
  'Crypto',
  'Gamble',
];

// ------------------
// 2) STYLES PAR SECTEUR
// ------------------

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

// ------------------
// 3) COMPOSANT
// ------------------

export default function SectorsTab({ onSelectStock }) {
  const [selectedSector, setSelectedSector] = useState(null);
  const [sectorData, setSectorData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtres (pour les secteurs sérieux; on les ignore pour Crypto/Gamble si tu veux)
  const [sectorMinMktCap, setSectorMinMktCap] = useState(0);
  const [sectorSortBy, setSectorSortBy] = useState('mktCap'); // mktCap | price | changePercent

  // ---- Helpers fetch via /api/stock (Yahoo) ----

  const fetchMultipleStocks = async (symbols) => {
    if (!symbols || symbols.length === 0) return [];

    const promises = symbols.map((sym) =>
      fetch(`/api/stock?symbol=${encodeURIComponent(sym)}&range=1d`)
        .then((r) => r.json())
        .catch(() => null),
    );

    const results = await Promise.all(promises);
    return results.filter((r) => r && !r.error && (r.price || r.price === 0));
  };

  const loadSector = async (sectorLabel) => {
    setLoading(true);
    try {
      const symbols = STATIC_SECTORS[sectorLabel] || [];
      const baseData = await fetchMultipleStocks(symbols);

      if (sectorLabel === 'Gamble') {
        // Ajoute le "upside" en % pour Gamble
        const withUpside = baseData.map((d) => {
          let upside = null;
          if (d.targetPrice && d.price) {
            upside = ((d.targetPrice - d.price) / d.price) * 100;
          }
          return { ...d, upside };
        });

        setSectorData(withUpside);
      } else {
        setSectorData(baseData);
      }
    } catch (e) {
      console.error('Erreur loadSector:', e);
      setSectorData([]);
    } finally {
      setLoading(false);
    }
  };

  // Charge les données quand on choisit un secteur
  useEffect(() => {
    if (!selectedSector) return;
    setSectorData([]);
    loadSector(selectedSector);
  }, [selectedSector]);

  // ------------------
  // 4) FILTRES / TRI
  // ------------------

  const filteredSectorData = useMemo(() => {
    let data = [...sectorData];

    // Pas de filtre cap pour Crypto & Gamble (tu peux activer si tu veux)
    if (selectedSector !== 'Crypto' && selectedSector !== 'Gamble') {
      if (sectorMinMktCap > 0) {
        data = data.filter((d) => (d.mktCap || 0) >= sectorMinMktCap);
      }
    }

    // Pour Gamble : tri spécial par upside décroissant
    if (selectedSector === 'Gamble') {
      data.sort((a, b) => {
        const upA = a.upside ?? -9999;
        const upB = b.upside ?? -9999;
        return upB - upA;
      });
      return data;
    }

    // Tri standard
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

  // ------------------
  // 5) RENDER
  // ------------------

  // Vue liste des secteurs
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
                        ? 'Prix cible >> prix actuel (très risqué)'
                        : 'Actions majeures du secteur'}
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

  // Vue détail d’un secteur
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

        <h2 className={`text-3xl font-bold flex items-center gap-3 ${style.color}`}>
          <Icon size={32} /> {selectedSector}
        </h2>
      </div>

      {/* Filtres uniquement pour les secteurs "classiques" */}
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
          <div className="text-slate-500">Analyse du secteur...</div>
        </div>
      ) : filteredSectorData.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-slate-900/60 border border-slate-800 rounded-2xl">
          Aucune action trouvée (peut-être un souci d&apos;API Yahoo).
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSectorData.map((d) => {
            const upsideLabel =
              selectedSector === 'Gamble' && d.upside != null
                ? `Potentiel cible: ${d.upside > 0 ? '+' : ''}${d.upside.toFixed(0)}%`
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
