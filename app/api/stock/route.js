import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  console.log(`🔍 [API] Demande reçue pour : ${symbol}`);

  if (!symbol) {
    return NextResponse.json({ error: 'Symbole manquant' }, { status: 400 });
  }

  try {
    // --- BLOC DE SÉCURITÉ : INSTANCIATION ---
    let yf = yahooFinance;
    // @ts-ignore
    if (yf.default) yf = yf.default;
    if (typeof yf === 'function') {
        // @ts-ignore
        yf = new yf();
    }
    if (yf.suppressNotices) yf.suppressNotices(['yahooSurvey']);
    // -----------------------------------------

    // 1. Récupération des infos (Prix + Description)
    const quote = await yf.quote(symbol);
    const quoteSummary = await yf.quoteSummary(symbol, { modules: ['summaryProfile'] });
    
    // 2. Récupération Historique (CORRECTION DATE)
    // On calcule la date d'il y a 1 mois nous-mêmes
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);

    const queryOptions = { 
        period1: oneMonthAgo.toISOString().split('T')[0], // Date de début format YYYY-MM-DD
        interval: '1d' 
    };
    
    const chartResult = await yf.chart(symbol, queryOptions);
    
    // Sécurisation des données du graphique
    const historical = (chartResult && chartResult.quotes) ? chartResult.quotes : [];

    const result = {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      mktCap: quote.marketCap,
      sector: quoteSummary.summaryProfile?.sector || 'N/A',
      description: quoteSummary.summaryProfile?.longBusinessSummary || 'Pas de description disponible.',
      chart: historical
        .filter(row => row.date && row.close)
        .map(row => ({
          name: new Date(row.date).toISOString().slice(5, 10), // Format MM-JJ
          prix: row.close
      }))
    };

    console.log(`✅ [API] Succès pour ${symbol}`);
    return NextResponse.json(result);

  } catch (error) {
    console.error(`❌ [API] Erreur pour ${symbol}:`, error.message);
    return NextResponse.json(
      { error: "Problème technique : " + error.message },
      { status: 500 }
    );
  }
}