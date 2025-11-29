import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  console.log("Moteur API appelé pour :", symbol);

  if (!symbol) {
    return NextResponse.json({ error: 'Symbole manquant' }, { status: 400 });
  }

  try {
    // CORRECTION : On s'assure que yahooFinance est bien prêt à l'emploi
    // On désactive aussi les avertissements "logger" qui peuvent polluer la console
    yahooFinance.suppressNotices(['yahooSurvey']);
    
    // 1. Récupération des données
    const quote = await yahooFinance.quote(symbol);
    const quoteSummary = await yahooFinance.quoteSummary(symbol, { modules: ['summaryProfile'] });
    
    // 2. Historique (30 jours)
    const queryOptions = { period1: '1mo', interval: '1d' };
    const historical = await yahooFinance.historical(symbol, queryOptions);

    const result = {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      mktCap: quote.marketCap,
      sector: quoteSummary.summaryProfile?.sector || 'N/A',
      description: quoteSummary.summaryProfile?.longBusinessSummary || 'Pas de description.',
      chart: historical.map(row => ({
        name: row.date.toISOString().slice(5, 10), // MM-JJ
        prix: row.close
      }))
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Erreur Backend:", error.message);
    
    // Si l'erreur persiste, on essaie une méthode de secours (hard-instanciation)
    // C'est ce que le message d'erreur suggérait, mais c'est rare d'en avoir besoin si l'import est bon.
    
    return NextResponse.json(
      { error: "Impossible de récupérer les données : " + error.message },
      { status: 500 }
    );
  }
}