// app/api/finnhub-sector/route.js
import { NextResponse } from 'next/server';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sector = searchParams.get('sector');        // ex: "technology", "finance", "healthcare", "auto"
  const limit = parseInt(searchParams.get('limit') || '80', 10);       // nombre max d'actions renvoyées
  const minMktCap = parseFloat(searchParams.get('minMktCap') || '0');  // en millions (Finnhub renvoie en millions)

  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'FINNHUB_API_KEY manquante dans les variables d’environnement.' },
      { status: 500 }
    );
  }

  if (!sector) {
    return NextResponse.json(
      { error: 'Paramètre "sector" manquant.' },
      { status: 400 }
    );
  }

  try {
    // 1) Récupère tous les symboles US
    const symbolsRes = await fetch(
      `${FINNHUB_BASE}/stock/symbol?exchange=US&token=${apiKey}`,
      { cache: 'no-store' }
    );

    if (!symbolsRes.ok) {
      const txt = await symbolsRes.text();
      throw new Error(`Erreur stock/symbol: ${symbolsRes.status} - ${txt}`);
    }

    /** @type {Array<any>} */
    const symbolsData = await symbolsRes.json();

    // On garde seulement les actions ordinaires
    const commonStocks = symbolsData.filter(
      (s) => s.type === 'Common Stock' || s.type === 'EQS'
    );

    // On limite pour respecter le free plan Finnhub
    const sliceSize = Math.min(commonStocks.length, 400);
    const subset = commonStocks.slice(0, sliceSize);

    // 2) Pour chaque symbole on récupère le profil (industry + market cap)
    const profilePromises = subset.map(async (s) => {
      try {
        const profRes = await fetch(
          `${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(
            s.symbol
          )}&token=${apiKey}`,
          { cache: 'no-store' }
        );
        if (!profRes.ok) return null;
        const profile = await profRes.json();

        const industry = profile.finnhubIndustry || 'N/A';
        const marketCap = profile.marketCapitalization || 0; // en millions

        return {
          symbol: s.symbol,
          name: profile.name || s.description || s.symbol,
          exchange: profile.exchange || s.exchange,
          industry,
          marketCap
        };
      } catch {
        return null;
      }
    });

    const profilesRaw = await Promise.all(profilePromises);
    const profiles = profilesRaw.filter(Boolean);

    const target = sector.toLowerCase();

    // 3) Filtre par "sector" demandé + market cap minimum
    const selected = profiles
      .filter((p) => {
        const ind = (p.industry || '').toLowerCase();

        const match =
          ind.includes(target) ||
          // quelques mappings souples
          (target === 'technology' &&
            (ind.includes('technology') ||
              ind.includes('semiconductor') ||
              ind.includes('software'))) ||
          (target === 'finance' &&
            (ind.includes('financial') ||
              ind.includes('bank') ||
              ind.includes('insurance'))) ||
          (target === 'healthcare' &&
            (ind.includes('health') || ind.includes('pharmaceutical'))) ||
          (target === 'auto' &&
            (ind.includes('automobile') ||
              ind.includes('auto') ||
              ind.includes('vehicle')));

        return match && p.marketCap >= minMktCap;
      })
      .sort((a, b) => b.marketCap - a.marketCap) // plus grosse cap en premier
      .slice(0, limit);

    return NextResponse.json({
      sector,
      count: selected.length,
      stocks: selected
    });
  } catch (err) {
    console.error('Erreur Finnhub sector:', err);
    return NextResponse.json(
      { error: err.message || 'Erreur interne Finnhub' },
      { status: 500 }
    );
  }
}
