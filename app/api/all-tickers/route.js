// app/api/all-tickers/route.js
import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export const maxDuration = 60; // au cas où ce soit long

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // nombre max de tickers qu'on veut (par défaut 3000)
    const countParam = parseInt(searchParams.get('count') || '3000', 10);
    const quotesCount = Math.min(Math.max(countParam, 100), 8000); // bornes mini/maxi

    // --- FIX TURBOPACK / ESM (même logique que tes autres routes) ---
    let yf = yahooFinance;
    // @ts-ignore
    if (yf.default) yf = yf.default;
    if (typeof yf === 'function') {
      // @ts-ignore
      yf = new yf();
    }
    if (yf.suppressNotices) yf.suppressNotices(['yahooSurvey']);
    // ----------------------------------------------------------------

    // On demande à Yahoo "le max de symboles possibles"
    const result = await yf.search('', {
      quotesCount,
      newsCount: 0,
    });

    const rawQuotes = Array.isArray(result?.quotes) ? result.quotes : [];

    // On garde seulement les symboles valides (et on enlève les doublons)
    const tickers = Array.from(
      new Set(
        rawQuotes
          .map((q) => q.symbol)
          .filter((s) => typeof s === 'string' && s.length > 0)
      )
    );

    return NextResponse.json({
      count: tickers.length,
      tickers,
    });
  } catch (error) {
    console.error('Erreur /api/all-tickers:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}
