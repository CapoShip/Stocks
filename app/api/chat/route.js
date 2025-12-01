import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 30;

// -------- Helpers --------
function isFinanceQuestion(text, data) {
  if (!text || typeof text !== 'string') {
    return !!(data && data.stockInfo);
  }

  const lower = text.toLowerCase();

  const financeKeywords = [
    'bourse', 'boursier', 'boursière', 'action', 'actions',
    'stock', 'stocks', 'marché', 'marchés', 'marches',
    'investir', 'investissement', 'investisseur', 'trading', 'trader',
    'dividende', 'dividendes', 'portefeuille', 'etf', 'indice', 'indices',
    'nasdaq', 'nyse', 'dow jones', 's&p', 'sp500',
    'call', 'put', 'option', 'options',
    'crypto', 'bitcoin', 'ethereum', 'solana'
  ];

  if (financeKeywords.some(k => lower.includes(k))) return true;

  const tickerRegex = /\b[A-Z]{2,6}\b/;
  if (tickerRegex.test(text)) return true;

  const hasDollarOrPercent = /\d+(\.\d+)?\s?(€|\$|%|pourcent)/i.test(text);
  if (hasDollarOrPercent) return true;

  if (data && data.stockInfo && data.stockInfo.symbol) return true;

  return false;
}

function buildStyleInstruction(mode) {
  switch ((mode || '').toLowerCase()) {
    case 'yt':
    case 'youtubeur':
      return "Ton: dynamique, direct, proche d'un youtubeur finance, mais toujours clair et compréhensible.";
    case 'buffett':
      return "Ton: calme, long terme, style investisseur value, sans sensationnalisme.";
    case 'technical':
    case 'technique':
      return "Ton: orienté analyse technique simple, en expliquant très clairement les termes.";
    case 'short':
    case 'ultra court':
      return "Ton: réponses ultra courtes, tu compresses au maximum tout en restant clair.";
    default:
      return "Ton: analyste professionnel, posé, très pédagogique.";
  }
}

// -------- Fetch revenus via Finnhub --------
async function fetchRevenueTTM(symbol) {
  if (!symbol) return null;
  if (!process.env.FINNHUB_API_KEY) {
    console.warn("FINNHUB_API_KEY manquante, pas de revenus disponibles.");
    return null;
  }

  try {
    const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(
      symbol
    )}&metric=all&token=${process.env.FINNHUB_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error("Erreur HTTP Finnhub:", res.status, await res.text());
      return null;
    }

    const json = await res.json();
    const metric = json && json.metric;
    const revenueTTM = metric && metric.revenueTTM;

    if (typeof revenueTTM === 'number') {
      return revenueTTM;
    }

    return null;
  } catch (err) {
    console.error("Erreur fetchRevenueTTM:", err);
    return null;
  }
}

// -------- Handler --------
export async function POST(req) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Clé GEMINI_API_KEY manquante dans les variables d'environnement." },
      { status: 500 }
    );
  }

  let messages = [];
  let data = {};
  let mode = 'pro';

  try {
    const body = await req.json();
    messages = body.messages || [];
    data = body.data || {};
    mode = body.mode || 'pro';
  } catch (e) {
    return NextResponse.json(
      { error: "Requête mal formée (JSON invalide ou corps vide)." },
      { status: 400 }
    );
  }

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const lastText = lastUserMsg ? (lastUserMsg.content || '') : '';

  if (!isFinanceQuestion(lastText, data)) {
    return NextResponse.json({
      text:
        "Je suis spécialisé uniquement dans les actions, ETF, indices et cryptos.\n\n" +
        "Exemples de questions que tu peux me poser:\n" +
        "- Analyse ce titre à court terme\n" +
        "- Cette action est-elle chère par rapport à ses bénéfices\n" +
        "- Que penses-tu de ce secteur\n" +
        "- Comment répartir un portefeuille par secteurs",
      id: 'not-finance',
      role: 'assistant',
    });
  }

  // -------- Enrichir avec les revenus si possible --------
  if (data.stockInfo && data.stockInfo.symbol) {
    try {
      const revenueTTM = await fetchRevenueTTM(data.stockInfo.symbol);
      if (revenueTTM != null) {
        data.stockInfo.revenueTTM = revenueTTM;
      }
    } catch (e) {
      console.error("Erreur lors de l'enrichissement des revenus:", e);
    }
  }

  const contextStock = data.stockInfo
    ? `Titre suivi dans le dashboard: ${data.stockInfo.symbol}, prix approximatif: ${data.stockInfo.price} USD, variation récente: ${data.stockInfo.changePercent} pour cent.` +
      (data.stockInfo.revenueTTM
        ? ` Revenus annuels approximatifs (TTM): ${data.stockInfo.revenueTTM} USD.`
        : '')
    : "Aucun titre spécifique n'est sélectionné dans le dashboard.";

  const styleInstruction = buildStyleInstruction(mode);

  const systemPrompt = `
Tu es CapoAI, assistant boursier premium intégré à la plateforme CapoStocks.

IDENTITÉ ET TON
- Tu es 100 pour cent spécialisé marchés financiers: actions, ETF, indices, cryptos.
- Tu es pédagogique, moderne, jamais robotique.
- Tu n'écris pas de phrase du style: bonjour, je suis CapoAI. Tu vas directement au contenu utile.

MISE EN FORME GLOBALE
- Aucune mise en forme avec astérisques ou markdown.
- Pas de gras, pas d'italique, pas de code.
- Tu utilises seulement:
  - Titres courts avec un emoji au début.
  - Listes avec tirets.
  - Phrases courtes.
  - Lignes vides pour aérer.
- Le rendu doit être lisible comme une fiche d'analyse sur un dashboard boursier.

ADAPTATION À LA QUESTION

1) Si la question est simple ou factuelle
   Exemple: "c'est quoi leur revenu", "c'est quoi leur secteur", "c'est quoi un ETF".
   - Tu réponds de manière directe, en une à quatre phrases maximum.
   - Tu ne fais PAS toute une structure Résumé / Scénarios / Risques.
   - Tu restes très concret.

   Revenus et chiffres:
   - Si le contexte du dashboard contient une information de revenu (par exemple: Revenus annuels approximatifs: X USD), tu peux la redire de façon claire à l'utilisateur, en précisant que c'est un ordre de grandeur.
   - Si aucune donnée de revenu n'est fournie dans le contexte, tu réponds:
     - Que tu n'as pas accès aux chiffres exacts et à jour pour cette entreprise.
     - Que l'utilisateur peut trouver les revenus précis dans les états financiers (rapports annuels ou trimestriels) ou sur un site de données financières.
   - Tu peux ajouter une phrase qualitative sur d'où viennent ces revenus (par exemple: prêts, commissions, services technologiques), sans inventer de chiffres.

2) Si la question demande une analyse
   Exemple: "analyse SOFI à court terme", "tu penses quoi de cette action", "est-ce intéressant d'entrer maintenant".
   - Là tu peux utiliser une structure plus complète, mais toujours courte et lisible.

STRUCTURE POUR LES QUESTIONS D'ANALYSE

1) Titre
   Exemple: "📌 SOFI – Vue générale" ou "📌 NVDA – Résumé rapide".

2) Résumé rapide
   - Tendance globale: haussière, baissière ou neutre.
   - Variation récente si disponible.
   - Prix actuel si disponible.
   - Deux ou trois lignes maximum.

3) Analyse technique ou fondamentale
   - Tu développes un peu, mais avec des blocs courts.
   - Tu relies ton analyse au contexte: secteur, type d'entreprise, volatilité, dynamique générale.
   - Deux à cinq lignes.

4) Scénarios
   - Scénario haussier: une ou deux phrases.
   - Scénario baissier: une ou deux phrases.
   - Scénario neutre: une ou deux phrases.

5) Risques
   - Deux à quatre lignes.
   - Tu peux mentionner volatilité, dépendance à un secteur, régulation, endettement, etc.

6) Conclusion
   - Une ou deux phrases qui résument la situation.

BLOC SCÉNARIO THÉORIQUE "SI TU ÉTAIS À MA PLACE"

- Tu n'affiches ce bloc que si l'utilisateur pose une question de type:
  "tu achèterais", "si tu étais à ma place", "tu serais acheteur ou vendeur".
- Tu réponds alors en profils:
  Profil prudent: phrase courte sur ce qu'il ferait en théorie.
  Profil neutre: phrase courte.
  Profil agressif: phrase courte.
- Puis une phrase du type:
  "Dans un scénario purement théorique, je serais plutôt acheteur, neutre ou vendeur pour telles raisons."
- Tu termines toujours ce bloc par:
  "Ce n'est pas un conseil financier personnalisé."

RÈGLES SUR LES CONSEILS
- Tu ne donnes jamais d'ordre: achète, vends, mets tout, c'est sûr, garanti.
- Tu restes dans l'analyse, les scénarios et les profils.
- Tu rappelles que tu ne connais pas la situation réelle de l'utilisateur.

UTILISATION DES DONNÉES
- Tu t'appuies d'abord sur la question de l'utilisateur.
- Tu utilises ensuite les informations du dashboard si elles existent.
- Tu n'inventes aucun chiffre précis qui n'est pas donné.
- Si des données clés manquent, tu le mentionnes une seule fois, de façon courte.

CONTEXTE DU DASHBOARD
${contextStock}

STYLE SELON LE MODE
${styleInstruction}

LANGUE
- Tu réponds toujours en français.
- Tu restes clair, direct, sans tourner en rond.
`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const contents = [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
      ...messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
    ];

    const result = await model.generateContent({ contents });
    const response = result.response;
    const text = response.text();

    return NextResponse.json({
      text,
      id: Date.now().toString(),
      role: 'assistant',
    });
  } catch (error) {
    console.error("ERREUR CRITIQUE [API CHAT / GEMINI]:", error);
    return NextResponse.json(
      { error: error.message || "Erreur inconnue de l'API Gemini" },
      { status: 500 }
    );
  }
}
