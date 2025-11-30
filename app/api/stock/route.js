import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1d';
  const interval = searchParams.get('interval') || '15m';

  console.log(`🔍 [API] Demande : ${symbol} | Range: ${range}`);

  if (!symbol) {
    return NextResponse.json({ error: 'Symbole manquant' }, { status: 400 });
  }

  try {
    let yf = yahooFinance;
    // @ts-ignore
    if (yf.default) yf = yf.default;
    if (typeof yf === 'function') {
        // @ts-ignore
        yf = new yf();
    }
    if (yf.suppressNotices) yf.suppressNotices(['yahooSurvey']);

    // 1. Infos générales (Prix actuel)
    const quote = await yf.quote(symbol);
    const quoteSummary = await yf.quoteSummary(symbol, { modules: ['summaryProfile'] });
    
    // 2. Récupération Historique
    // Pour 1J, on veut les données précises (intraday)
    // Pour les autres, on veut l'historique
    const today = new Date();
    const period1 = new Date(today);

    // Ajustement des dates pour Yahoo
    switch (range) {
        case '1d': period1.setDate(today.getDate() - 5); break; // On prend large pour le week-end
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

    // Filtrer les données invalides
    historical = historical.filter(row => row.date && row.close);

    // --- CALCUL MAGIQUE DU POURCENTAGE ---
    let dynamicChange = 0;
    let dynamicChangePercent = 0;
    const currentPrice = quote.regularMarketPrice;

    if (range === '1d' || range === '1J') {
        // Pour 1 Jour, on utilise la donnée officielle "Variation Journalière"
        dynamicChange = quote.regularMarketChange;
        dynamicChangePercent = quote.regularMarketChangePercent;
    } else {
        // Pour les autres périodes, on calcule : Prix Actuel - Prix au début du graphique
        if (historical.length > 0) {
            const startPrice = historical[0].close;
            dynamicChange = currentPrice - startPrice;
            dynamicChangePercent = (dynamicChange / startPrice) * 100;
        }
    }
    // -------------------------------------

    const result = {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName,
      price: currentPrice,
      
      // On envoie nos valeurs calculées dynamiquement
      change: dynamicChange,
      changePercent: dynamicChangePercent,
      
      mktCap: quote.marketCap,
      sector: quoteSummary.summaryProfile?.sector || 'N/A',
      description: quoteSummary.summaryProfile?.longBusinessSummary || 'Pas de description disponible.',
      chart: historical.map(row => ({
          date: row.date, 
          prix: row.close
      }))
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error(`❌ [API] Erreur:`, error.message);
    return NextResponse.json(
      { error: "Problème technique : " + error.message },
      { status: 500 }
    );
  }
}