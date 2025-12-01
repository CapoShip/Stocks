// app/api/all-tickers/route.js
import { NextResponse } from 'next/server';
import { ALL_TICKERS } from '@/lib/allTickers';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const countParam = searchParams.get('count');

    let list = ALL_TICKERS;

    // ?count=5000 → on peut limiter si tu veux
    if (countParam) {
      const count = parseInt(countParam, 10);
      if (!Number.isNaN(count) && count > 0 && count < ALL_TICKERS.length) {
        list = ALL_TICKERS.slice(0, count);
      }
    }

    // 👇 format EXACT attendu par SectorsTab
    return NextResponse.json({ tickers: list });
  } catch (error) {
    console.error('Erreur /api/all-tickers:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur all-tickers' },
      { status: 500 }
    );
  }
}
