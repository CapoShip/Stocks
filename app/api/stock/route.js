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
    let yf = yahooFinance;

    // --- CORRECTION 1 : INSTANCIATION (Pour Turbopack) ---
    // @ts-ignore
    if (yf.default) yf = yf.default;
    if (typeof yf === 'function') {
        console.log("⚠️ Instanciation YahooFinance...");
        // @ts-ignore
        yf = new yf();
    }
    if (yf.suppressNotices) yf.suppressNotices(['yahooSurvey']);
    // -----------------------------------------------------

    // 1. Récupération des données (Prix + Profil)
    const quote = await yf.quote(symbol);
    const quoteSummary = await yf.quoteSummary(symbol, { modules: ['summaryProfile'] });
    
    // --- CORRECTION 2 : UTILISATION DE 'CHART' (Au lieu de historical) ---
    // La méthode chart est plus robuste pour les intervalles comme "1mo"
    const chartResult = await yf.chart(symbol, { range: '1mo', interval: '1d' });
    
    // Les données historiques sont dans .quotes avec la méthode chart
    const historical = chartResult.quotes || [];
    // ---------------------------------------------------------------------

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