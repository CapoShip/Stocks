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
    
    // 2. Calcul de la date de début (period1) à partir du range
    // Yahoo veut une date précise, pas juste "1mo"
    const today = new Date();
    const period1 = new Date(today);

    switch (range) {
        case '1d':
            period1.setDate(today.getDate() - 3); // On recule de 3 jours pour être sûr d'avoir des données (week-end)
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
            period1.setMonth(today.getMonth() - 1);
    }

    const queryOptions = { 
        period1: period1.toISOString().split('T')[0], // Format YYYY-MM-DD
        interval: interval 
        // Note: On ne met PAS 'range' ici pour éviter l'erreur
    };

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