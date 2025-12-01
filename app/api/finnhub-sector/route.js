// app/api/finnhub-sector/route.js
import { NextResponse } from 'next/server';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

// Fallback en cas de résultat vide (ou limite API) :
// ça garantit qu'on ait TOUJOURS quelques grosses actions par secteur.
const FALLBACK_SECTORS = {
  technology: ['AAPL', 'MSFT', 'NVDA', 'AMD', 'AVGO', 'META', 'GOOGL'],
  finance: ['JPM', 'BAC', 'GS', 'MS', 'C', 'WFC', 'BLK'],
  healthcare: ['UNH', 'JNJ', 'PFE', 'MRK', 'LLY', 'ABBV'],
  auto: ['TSLA', 'F', 'GM', 'TM', 'HMC', 'STLA'],
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sector = searchParams.get('sector'); // ex: "technology", "finance"
  const limit = parseInt(searchParams.get('limit') || '80', 10);
  const minMktCap = parseFloat(searchParams.get('minMktCap') || '0'); // (en millions, mais on filtrera surtout côté front)

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
    // 1) Récupère les symboles US
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

    // 2) On récupère le profil pour chaque symbole (industry + market cap)
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

        const industry = profile.finnhubIndustry || profile.industry || 'N/A';
        const marketCap = profile.marketCapitalization || 0; // Finnhub = en millions

        return {
          symbol: s.symbol,
          name: profile.name || s.description || s.symbol,
          exchange: profile.exchange || s.exchange,
          industry,
          marketCap,
        };
      } catch {
        return null;
      }
    });

    const profilesRaw = await Promise.all(profilePromises);
    const profiles = profilesRaw.filter(Boolean);

    const target = sector.toLowerCase();

    // 3) Filtre par secteur demandé (+ cap mini Finnhub si tu veux l’utiliser)
    const selected = profiles
      .filter((p) => {
        const ind = (p.industry || '').toLowerCase();

        // mapping large pour bien choper les secteurs
        const isTech =
          ind.includes('tech') ||
          ind.includes('software') ||
          ind.includes('semiconductor') ||
          ind.includes('communication equipment');

        const isFin =
          ind.includes('financial') ||
          ind.includes('bank') ||
          ind.includes('insurance') ||
          ind.includes('capital markets') ||
          ind.includes('credit services');

        const isHealth =
          ind.includes('health') ||
          ind.includes('healthcare') ||
          ind.includes('biotechnology') ||
          ind.includes('drug manufacturers') ||
          ind.includes('pharmaceutical');

        const isAuto =
          ind.includes('automobile') ||
          ind.includes('auto') ||
          ind.includes('vehicle') ||
          ind.includes('auto manufacturers');

        let match = false;

        if (target === 'technology') match = isTech;
        else if (target === 'finance') match = isFin;
        else if (target === 'healthcare') match = isHealth;
        else if (target === 'auto') match = isAuto;
        else match = ind.includes(target); // fallback générique

        // petit filtrage sur marketCap Finnhub (en millions)
        const capOk =
          !Number.isFinite(minMktCap) ||
          minMktCap <= 0 ||
          (p.marketCap || 0) >= minMktCap;

        return match && capOk;
      })
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, limit);

    let finalStocks = selected;

    // 4) Si aucun résultat (ou problème API / mapping), on bascule sur le fallback
    if (finalStocks.length === 0) {
      const fallbackSymbols = FALLBACK_SECTORS[target] || [];
      finalStocks = fallbackSymbols.slice(0, limit).map((sym) => ({
        symbol: sym,
        name: sym,
        exchange: 'US',
        industry: target,
        marketCap: 0,
      }));
    }

    return NextResponse.json({
      sector: target,
      count: finalStocks.length,
      stocks: finalStocks,
    });
  } catch (err) {
    console.error('Erreur Finnhub sector:', err);

    // En cas d’erreur totale Finnhub, on renvoie directement les fallbacks
    const target = (sector || '').toLowerCase();
    const fallbackSymbols = FALLBACK_SECTORS[target] || [];

    if (fallbackSymbols.length > 0) {
      const fallbackStocks = fallbackSymbols.map((sym) => ({
        symbol: sym,
        name: sym,
        exchange: 'US',
        industry: target,
        marketCap: 0,
      }));

      return NextResponse.json({
        sector: target,
        count: fallbackStocks.length,
        stocks: fallbackStocks,
        warning: 'Résultats basés sur une liste statique (fallback), Finnhub indisponible.',
      });
    }

    return NextResponse.json(
      { error: err.message || 'Erreur interne Finnhub' },
      { status: 500 }
    );
  }
}
