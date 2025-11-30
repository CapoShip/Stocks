import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1d';
  const interval = searchParams.get('interval') || '15m';

  if (!symbol) return NextResponse.json({ error: 'Symbole manquant' }, { status: 400 });

  try {
    let yf = yahooFinance;
    // @ts-ignore
    if (yf.default) yf = yf.default;
    if (typeof yf === 'function') {
        // @ts-ignore
        yf = new yf();
    }
    if (yf.suppressNotices) yf.suppressNotices(['yahooSurvey']);

    // 1. Récupération Données
    const [quote, quoteSummary, searchResult] = await Promise.all([
        yf.quote(symbol),
        yf.quoteSummary(symbol, { modules: ['summaryProfile', 'financialData', 'defaultKeyStatistics', 'recommendationTrend'] }),
        yf.search(symbol, { newsCount: 10 }) 
    ]);
    
    // 2. Historique avec dates calculées
    const today = new Date();
    const period1 = new Date(today);

    switch (range) {
        case '1d': period1.setDate(today.getDate() - 5); break; // On prend large pour week-end
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
    
    // NETTOYAGE CRITIQUE POUR LE GRAPHIQUE
    // 1. On enlève les valeurs nulles
    // 2. On trie par date croissante (évite les retours en arrière)
    historical = historical
        .filter(row => row.date && row.close !== null && row.close !== undefined)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calcul Variation
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

    const summary = quoteSummary.summaryProfile || {};
    const finance = quoteSummary.financialData || {};
    const stats = quoteSummary.defaultKeyStatistics || {};

    const cleanNews = (searchResult.news || []).map(n => ({
        uuid: n.uuid,
        link: n.link,
        title: n.title,
        publisher: n.publisher,
        providerPublishTime: n.providerPublishTime || Date.now() / 1000
    }));

    const result = {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName,
      price: currentPrice,
      change: dynamicChange,
      changePercent: dynamicChangePercent,
      mktCap: quote.marketCap,
      volume: quote.regularMarketVolume,
      peRatio: quote.trailingPE || null,
      beta: stats.beta || null,
      sector: summary.sector || 'N/A',
      industry: summary.industry || 'N/A',
      description: summary.longBusinessSummary || 'Aucune description disponible.',
      targetPrice: finance.targetMeanPrice || null,
      recommendation: finance.recommendationKey || 'none',
      news: cleanNews,
      // On envoie le timestamp brut pour que le frontend gère l'axe X parfaitement
      chart: historical.map(row => ({ 
          date: row.date, // Gardé pour debug
          timestamp: new Date(row.date).getTime(), // Pour l'axe X numérique
          prix: row.close 
      }))
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error(`❌ [API] Erreur ${symbol}:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}