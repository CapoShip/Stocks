'use client';

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Search, Bell, Menu, User, 
  Activity, DollarSign, Clock, BarChart2, List, Plus, Trash2, ArrowRight
} from 'lucide-react';

// --- CONFIGURATION API ---
// ⚠️ REMPLACE 'demo' PAR TA PROPRE CLÉ GRATUITE (https://www.alphavantage.co/support/#api-key)
const API_KEY = 'ZN0HQFCI78AYJKIP'; 

// --- Données de Secours (Fallback) ---
const generateChartData = (points = 30, volatility = 5) => {
  let data = [];
  let price = 150;
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * volatility;
    price += change;
    data.push({
      name: `J${i + 1}`,
      prix: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 10000) + 5000
    });
  }
  return data;
};

const NEWS_FEED = [
  { id: 1, title: "La Fed annonce une pause sur les taux", source: "Bloomberg", time: "2h" },
  { id: 2, title: "Nouveaux résultats trimestriels explosifs pour la Tech", source: "Reuters", time: "4h" },
  { id: 3, title: "Analyse : Le secteur EV en pleine mutation", source: "Financial Times", time: "6h" },
];

export default function StockDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStock, setSelectedStock] = useState('IBM'); // IBM fonctionne avec la clé 'demo'
  const [searchQuery, setSearchQuery] = useState('');
  const [chartData, setChartData] = useState([]);
  const [watchlist, setWatchlist] = useState(['IBM', 'AAPL', 'TSLA', 'MSFT']);
  const [loading, setLoading] = useState(false);
  const [stockInfo, setStockInfo] = useState({
    name: 'Chargement...',
    price: 0,
    change: 0,
    sector: 'Technologie',
    pe: 0,
    mktCap: '---',
    beta: 0
  });

  // Fonction pour récupérer les VRAIES données
  const fetchStockData = async (symbol) => {
    setLoading(true);
    try {
      // 1. Récupérer le prix actuel (Global Quote)
      const quoteRes = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`);
      const quoteData = await quoteRes.json();
      
      // 2. Récupérer l'historique pour le graphique (Daily)
      const historyRes = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`);
      const historyData = await historyRes.json();

      // Vérifier si l'API a renvoyé une erreur (limite atteinte ou symbole invalide)
      if (quoteData['Global Quote'] && historyData['Time Series (Daily)']) {
        const quote = quoteData['Global Quote'];
        
        // Mise à jour des infos du titre
        setStockInfo({
          name: symbol, // L'API gratuite ne donne pas le nom complet (ex: Apple), on garde le symbole
          price: parseFloat(quote['05. price']).toFixed(2),
          change: parseFloat(quote['10. change percent'].replace('%', '')).toFixed(2),
          sector: 'Technologie', // Donnée non dispo dans l'API gratuite basic
          pe: '---', 
          mktCap: '---',
          beta: '---'
        });

        // Transformation des données pour le graphique
        const timeSeries = historyData['Time Series (Daily)'];
        const formattedChartData = Object.keys(timeSeries)
          .slice(0, 30) // Prendre les 30 derniers jours
          .reverse() // Mettre dans l'ordre chronologique
          .map(date => ({
            name: date.slice(5), // Garder juste MM-JJ
            prix: parseFloat(timeSeries[date]['4. close'])
          }));
        
        setChartData(formattedChartData);
      } else {
        console.warn("Limite API atteinte ou erreur. Utilisation des données de secours.");
        // Fallback si l'API échoue (limite gratuite dépassée)
        setStockInfo({ name: symbol, price: 150.00, change: 1.5, sector: 'Mode Démo', pe: 0, mktCap: '---', beta: 0 });
        setChartData(generateChartData(30));
      }

    } catch (error) {
      console.error("Erreur de fetch:", error);
      setChartData(generateChartData(30));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStockData(selectedStock);
  }, [selectedStock]);

  const isPositive = parseFloat(stockInfo.change) >= 0;

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.toUpperCase();
    if (query) {
      setSelectedStock(query);
      setSearchQuery('');
      if (!watchlist.includes(query)) {
        setWatchlist([...watchlist, query]);
      }
    }
  };

  const removeFromWatchlist = (symbol) => {
    setWatchlist(watchlist.filter(s => s !== symbol));
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      
      {/* Sidebar / Navigation Latérale */}
      <div className="w-20 md:w-64 bg-slate-950 border-r border-slate-800 flex-shrink-0 flex flex-col justify-between">
        <div>
          <div className="p-6 flex items-center gap-3 font-bold text-xl text-blue-400">
            <Activity className="w-8 h-8" />
            <span className="hidden md:block">AlphaTrade</span>
          </div>
          
          <nav className="mt-6 flex flex-col gap-2 px-3">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}
            >
              <BarChart2 size={20} />
              <span className="hidden md:block">Tableau de bord</span>
            </button>
            <button 
              onClick={() => setActiveTab('news')}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'news' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}
            >
              <List size={20} />
              <span className="hidden md:block">Actualités</span>
            </button>
          </nav>

          {/* Watchlist Section */}
          <div className="mt-8 px-4 hidden md:block">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Mes Favoris</h3>
            <div className="space-y-2">
              {watchlist.map(symbol => (
                  <div 
                    key={symbol} 
                    onClick={() => setSelectedStock(symbol)}
                    className={`p-3 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-600 transition-colors ${selectedStock === symbol ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm">{symbol}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Action</span>
                      <button onClick={(e) => { e.stopPropagation(); removeFromWatchlist(symbol); }} className="hover:text-red-400">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 text-slate-400 hover:text-white cursor-pointer">
            <User size={20} />
            <span className="hidden md:block text-sm">Mon Profil</span>
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
              placeholder="Rechercher (ex: IBM, AAPL)..." 
              className="bg-slate-900 border border-slate-700 text-sm rounded-full pl-10 pr-4 py-2 w-64 focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer">
              <Bell size={20} className="text-slate-400 hover:text-white" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </div>
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Connecter Courtier
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-900">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Top Stats Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                  {stockInfo.name} <span className="text-slate-500 text-lg font-normal">({selectedStock})</span>
                </h1>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-4xl font-bold text-white">${stockInfo.price}</span>
                  <span className={`text-lg font-medium flex items-center ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? <TrendingUp size={20} className="mr-1" /> : <TrendingDown size={20} className="mr-1" />}
                    {stockInfo.change}% Aujourd'hui
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {['1J', '1S', '1M', '3M', '1A', '5A'].map((period) => (
                  <button key={period} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${period === '1M' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Chart Section - Takes up 2/3 */}
              <div className="lg:col-span-2 bg-slate-950 rounded-2xl p-6 border border-slate-800 shadow-xl">
                <div className="h-80 w-full">
                  {loading ? (
                    <div className="h-full w-full flex items-center justify-center text-slate-500">Chargement des données...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isPositive ? "#4ade80" : "#f87171"} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={isPositive ? "#4ade80" : "#f87171"} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" hide />
                        <YAxis domain={['auto', 'auto']} orientation="right" tick={{fill: '#64748b'}} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
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
                  )}
                </div>
              </div>

              {/* Key Statistics - Takes up 1/3 */}
              <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
                <h2 className="text-lg font-semibold mb-4 text-slate-200">Statistiques Clés</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-800">
                    <span className="text-slate-400 text-sm">Capitalisation</span>
                    <span className="font-medium">{stockInfo.mktCap}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-800">
                    <span className="text-slate-400 text-sm">Ratio P/E</span>
                    <span className="font-medium">{stockInfo.pe}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-800">
                    <span className="text-slate-400 text-sm">Secteur</span>
                    <span className="font-medium text-right">{stockInfo.sector}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-800">
                    <span className="text-slate-400 text-sm">Beta (Volatilité)</span>
                    <span className={`font-medium ${stockInfo.beta > 1.5 ? 'text-orange-400' : 'text-slate-200'}`}>{stockInfo.beta}</span>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Sentiment Analystes</h3>
                  <div className="flex gap-1 h-2 rounded-full overflow-hidden w-full">
                    <div className="bg-green-500 w-[60%]"></div>
                    <div className="bg-yellow-500 w-[30%]"></div>
                    <div className="bg-red-500 w-[10%]"></div>
                  </div>
                  <div className="flex justify-between text-xs mt-1 text-slate-400">
                    <span>Acheter (60%)</span>
                    <span>Vendre (10%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Analysis & News */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Technical Analysis Card */}
               <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-200">Analyse Technique</h2>
                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase">Achat Fort</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">
                    Le titre se négocie au-dessus de sa moyenne mobile à 200 jours. Le RSI indique une dynamique positive mais approche de la zone de surachat.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                      <span className="block text-xs text-slate-500">RSI (14)</span>
                      <span className="font-bold text-lg text-yellow-400">68.4</span>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                      <span className="block text-xs text-slate-500">MACD</span>
                      <span className="font-bold text-lg text-green-400">+1.25</span>
                    </div>
                  </div>
               </div>

               {/* News Feed */}
               <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800">
                  <h2 className="text-lg font-semibold mb-4 text-slate-200">Dernières Actualités</h2>
                  <div className="space-y-4">
                    {NEWS_FEED.map(news => (
                      <div key={news.id} className="group cursor-pointer">
                        <div className="flex justify-between items-start">
                          <h3 className="text-sm font-medium text-slate-300 group-hover:text-blue-400 transition-colors line-clamp-1">{news.title}</h3>
                          <span className="text-xs text-slate-600 whitespace-nowrap ml-2">{news.time}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-slate-900 text-slate-500 rounded border border-slate-800">{news.source}</span>
                        </div>
                      </div>
                    ))}
                    <button className="w-full mt-2 py-2 text-xs text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 transition-colors">
                      Voir plus d'actualités <ArrowRight size={12} />
                    </button>
                  </div>
               </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}