import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  console.log("🔍 Moteur API appelé pour :", symbol);

  if (!symbol) {
    return NextResponse.json({ error: 'Symbole manquant' }, { status: 400 });
  }

  try {
    // --- CORRECTION CRITIQUE POUR TURBOPACK ---
    // On vérifie si yahooFinance est prêt à l'emploi ou s'il faut le "créer" avec new()
    let yf = yahooFinance;
    
    // Si la fonction 'quote' n'existe pas directement, c'est qu'on a reçu la Classe
    if (!yf.quote) {
        console.log("⚠️ Instanciation manuelle de YahooFinance...");
        // @ts-ignore
        yf = new yahooFinance();
    }

    // On supprime les alertes seulement si la fonction existe (pour éviter le crash)
    if (yf.suppressNotices) {
        yf.suppressNotices(['yahooSurvey']);
    }
    // -------------------------------------------

    // 1. Récupération des données
    const quote = await yf.quote(symbol);
    const quoteSummary = await yf.quoteSummary(symbol, { modules: ['summaryProfile'] });
    
    // 2. Historique (30 jours)
    const queryOptions = { period1: '1mo', interval: '1d' };
    const historical = await yf.historical(symbol, queryOptions);

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
    console.error("❌ Erreur Backend:", error.message);
    return NextResponse.json(
      { error: "Impossible de récupérer les données : " + error.message },
      { status: 500 }
    );
  }
}