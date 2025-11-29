import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1mo'; // Par défaut 1 mois
  const interval = searchParams.get('interval') || '1d'; // Par défaut 1 jour

  console.log(`🔍 [API] Demande : ${symbol} | Range: ${range} | Interval: ${interval}`);

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

    // 1. Infos générales
    const quote = await yf.quote(symbol);
    const quoteSummary = await yf.quoteSummary(symbol, { modules: ['summaryProfile'] });
    
    // 2. Historique avec paramètres dynamiques
    const queryOptions = { range, interval };
    const chartResult = await yf.chart(symbol, queryOptions);
    
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
      // On envoie la date brute, le frontend s'occupera du formatage (heure vs date)
      chart: historical
        .filter(row => row.date && row.close)
        .map(row => ({
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