import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length === 0) {
    return NextResponse.json({ results: [] });
  }

  try {
    // --- CORRECTIF TURBOPACK (Comme pour le moteur stock) ---
    let yf = yahooFinance;
    // @ts-ignore
    if (yf.default) yf = yf.default;
    if (typeof yf === 'function') {
        // @ts-ignore
        yf = new yf();
    }
    if (yf.suppressNotices) yf.suppressNotices(['yahooSurvey']);
    // --------------------------------------------------------

    const results = await yf.search(query);
    
    const quotes = results.quotes
      .filter(q => q.isYahooFinance)
      .slice(0, 6)
      .map(q => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exch: q.exchange,
        type: q.quoteType
      }));

    return NextResponse.json({ results: quotes });
  } catch (error) {
    console.error("Erreur Search:", error);
    return NextResponse.json({ results: [] });
  }
}