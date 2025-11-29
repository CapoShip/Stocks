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
    const quote = await yahooFinance.quote(symbol);
    const quoteSummary = await yahooFinance.quoteSummary(symbol, { modules: ['summaryProfile'] });
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
        name: row.date.toISOString().slice(5, 10),
        prix: row.close
      }))
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Erreur Backend:", error);
    return NextResponse.json(
      { error: "Impossible de récupérer les données." },
      { status: 500 }
    );
  }
}