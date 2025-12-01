import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1d';
  const interval = searchParams.get('interval') || '15m';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbole manquant' }, { status: 400 });
  }

  try {
    // --- FIX TURBOPACK / ESM ---
    let yf = yahooFinance;
    // @ts-ignore
    if (yf.default) yf = yf.default;
    if (typeof yf === 'function') {
      // @ts-ignore
      yf = new yf();
    }
    if (yf.suppressNotices) yf.suppressNotices(['yahooSurvey']);
    // ----------------------------

    // 1. Récupération quote + summary + news
    const [quote, quoteSummary, searchResult] = await Promise.all([
      yf.quote(symbol),
      yf.quoteSummary(symbol, {
        modules: [
          'summaryProfile',
          'financialData',
          'defaultKeyStatistics',
          'price',
        ],
      }),
      yf.search(symbol, { newsCount: 10 }),
    ]);

    // 2. Historique pour le graphique
    const today = new Date();
    const period1 = new Date(today);

    switch (range) {
      case '1d':
        period1.setDate(today.getDate() - 5);
        break;
      case '5d':
        period1.setDate(today.getDate() - 7);
        break;
      case '1mo':
        period1.setMonth(today.getMonth() - 1);
        break;
      case '6mo':
        period1.setMonth(today.getMonth() - 6);
        break;
      case '1y':
        period1.setFullYear(today.getFullYear() - 1);
        break;
      case '5y':
        period1.setFullYear(today.getFullYear() - 5);
        break;
      default:
        period1.setDate(today.getDate() - 5);
    }

    const queryOptions = {
      period1: Math.floor(period1.getTime() / 1000),
      period2: Math.floor(today.getTime() / 1000),
      interval: interval,
    };

    const chartResult = await yf.chart(symbol, queryOptions);
    let historical = chartResult && chartResult.quotes ? chartResult.quotes : [];

    // Nettoyage : pas de valeurs nulles, triées par date
    historical = historical
      .filter(
        (row) => row.date && row.close !== null && row.close !== undefined
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Variation dynamique
    const currentPrice = quote.regularMarketPrice;
    let dynamicChange = 0;
    let dynamicChangePercent = 0;

    if (range === '1d' || range === '1J') {
      dynamicChange = quote.regularMarketChange;
      dynamicChangePercent = quote.regularMarketChangePercent;
    } else if (historical.length > 0 && currentPrice) {
      const startPrice = historical[0].close;
      dynamicChange = currentPrice - startPrice;
      dynamicChangePercent = (dynamicChange / startPrice) * 100;
    }

    const summary = quoteSummary.summaryProfile || {};
    const finance = quoteSummary.financialData || {};
    const stats = quoteSummary.defaultKeyStatistics || {};
    const priceModule = quoteSummary.price || {};

    const cleanNews = (searchResult.news || []).map((n) => ({
      uuid: n.uuid,
      link: n.link,
      title: n.title,
      publisher: n.publisher,
      providerPublishTime: n.providerPublishTime || Date.now() / 1000,
    }));

    const result = {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName || priceModule.longName,
      price: currentPrice,
      change: dynamicChange,
      changePercent: dynamicChangePercent,
      mktCap: quote.marketCap,
      volume: quote.regularMarketVolume,

      // 🔥 NOUVEAUX CHAMPS POUR REMPLIR TON DASHBOARD
      dayHigh:
        quote.regularMarketDayHigh ??
        quote.dayHigh ??
        priceModule.regularMarketDayHigh ??
        null,
      dayLow:
        quote.regularMarketDayLow ??
        quote.dayLow ??
        priceModule.regularMarketDayLow ??
        null,
      fiftyTwoWeekHigh:
        quote.fiftyTwoWeekHigh ??
        priceModule.fiftyTwoWeekHigh ??
        stats.fiftyTwoWeekHigh ??
        null,
      fiftyTwoWeekLow:
        quote.fiftyTwoWeekLow ??
        priceModule.fiftyTwoWeekLow ??
        stats.fiftyTwoWeekLow ??
        null,

      peRatio: quote.trailingPE || finance.trailingPE || null,
      beta: stats.beta || null,
      sector: summary.sector || 'N/A',
      industry: summary.industry || 'N/A',
      description:
        summary.longBusinessSummary || 'Aucune description disponible.',
      targetPrice: finance.targetMeanPrice || null,
      recommendation: finance.recommendationKey || 'none',
      news: cleanNews,

      chart: historical.map((row) => ({
        date: row.date,
        timestamp: new Date(row.date).getTime(),
        prix: row.close,
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error(`❌ [API] Erreur ${symbol}:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
