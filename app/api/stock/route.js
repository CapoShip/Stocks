import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1d';
  const interval = searchParams.get('interval') || '15m';

  if (!symbol) return NextResponse.json({ error: 'Symbole manquant' }, { status: 400 });

  try {
    // --- INSTANCIATION SÉCURISÉE ---
    let yf = yahooFinance;
    // @ts-ignore
    if (yf.default) yf = yf.default;
    if (typeof yf === 'function') {
        // @ts-ignore
        yf = new yf();
    }
    if (yf.suppressNotices) yf.suppressNotices(['yahooSurvey']);

    // 1. Récupération Parallèle (Optimisation Vitesse)
    // On demande : Le prix, le profil (secteur), les données financières (cible), et les news
    const [quote, quoteSummary, searchResult] = await Promise.all([
        yf.quote(symbol),
        yf.quoteSummary(symbol, { modules: ['summaryProfile', 'financialData', 'defaultKeyStatistics'] }),
        yf.search(symbol, { newsCount: 8 }) // On demande 8 news récentes
    ]);
    
    // 2. Historique (Chart) avec calcul de date précis
    const today = new Date();
    const period1 = new Date(today);

    switch (range) {
        case '1d': period1.setDate(today.getDate() - 5); break; // Large pour week-end
        case '5d': period1.setDate(today.getDate() - 7); break;
        case '1mo': period1.setMonth(today.getMonth() - 1); break;
        case '6mo': period1.setMonth(today.getMonth() - 6); break;
        case '1y': period1.setFullYear(today.getFullYear() - 1); break;
        case '5y': period1.setFullYear(today.getFullYear() - 5); break;
        default: period1.setDate(today.getDate() - 5);
    }

    const queryOptions = { 
        period1: Math.floor(period1.getTime() / 1000),
        period2: Math.floor(today.getTime() / 1000),
        interval: interval 
    };

    const chartResult = await yf.chart(symbol, queryOptions);
    let historical = (chartResult && chartResult.quotes) ? chartResult.quotes : [];
    historical = historical.filter(row => row.date && row.close);

    // Calcul Variation Dynamique
    let dynamicChange = 0;
    let dynamicChangePercent = 0;
    const currentPrice = quote.regularMarketPrice;

    if (range === '1d' || range === '1J') {
        dynamicChange = quote.regularMarketChange;
        dynamicChangePercent = quote.regularMarketChangePercent;
    } else if (historical.length > 0) {
        const startPrice = historical[0].close;
        dynamicChange = currentPrice - startPrice;
        dynamicChangePercent = (dynamicChange / startPrice) * 100;
    }

    // Extraction sécurisée des données
    const summary = quoteSummary.summaryProfile || {};
    const finance = quoteSummary.financialData || {};
    const stats = quoteSummary.defaultKeyStatistics || {};

    const result = {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName,
      price: currentPrice,
      change: dynamicChange,
      changePercent: dynamicChangePercent,
      
      // Données fondamentales
      mktCap: quote.marketCap,
      volume: quote.regularMarketVolume,
      peRatio: quote.trailingPE || null,
      sector: summary.sector || 'N/A',
      industry: summary.industry || 'N/A',
      description: summary.longBusinessSummary || 'Aucune description disponible.',
      targetPrice: finance.targetMeanPrice || null,
      recommendation: finance.recommendationKey || 'none', // buy, hold, sell
      
      // Actualités (Yahoo Search renvoie un tableau 'news')
      news: searchResult.news || [],
      
      // Graphique
      chart: historical.map(row => ({ date: row.date, prix: row.close }))
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error(`❌ [API] Erreur ${symbol}:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}