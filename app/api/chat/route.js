import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 30;

// -------- Helpers --------
function isFinanceQuestion(text, data) {
  if (!text || typeof text !== 'string') {
    return !!(data && data.stockInfo);
  }

  const lower = text.toLowerCase();

  // Mots-clés finance / bourse
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

  // Mot en MAJUSCULES type ticker : NVDA, APLD, TSLA, BTC…
  const tickerRegex = /\b[A-Z]{2,6}\b/;
  if (tickerRegex.test(text)) return true;

  // Prix / pourcentage
  const hasDollarOrPercent = /\d+(\.\d+)?\s?(€|\$|%|pourcent)/i.test(text);
  if (hasDollarOrPercent) return true;

  // Si le frontend a déjà un titre sélectionné
  if (data && data.stockInfo && data.stockInfo.symbol) return true;

  return false;
}

function buildStyleInstruction(mode) {
  switch ((mode || '').toLowerCase()) {
    case 'yt':
    case 'youtubeur':
      return "Parle comme un YouTubeur finance énergique, en tutoyant, avec des exemples concrets et un ton dynamique.";
    case 'buffett':
      return "Parle comme un investisseur value à la Warren Buffett : calme, long terme, axé sur les fondamentaux, sans sensationnalisme.";
    case 'technical':
    case 'technique':
      return "Fais surtout de l’analyse technique : tendance, supports/résistances, volumes, RSI, etc., mais explique simplement.";
    case 'short':
    case 'ultra court':
      return "Réponds en 3–4 phrases maximum, très concises et directes.";
    default:
      return "Réponds comme un analyste professionnel mais pédagogique, en français simple.";
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

  // Dernier message utilisateur
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const lastText = lastUserMsg ? (lastUserMsg.content || '') : '';

  // Si ce n'est clairement PAS une question finance → on refuse
  if (!isFinanceQuestion(lastText, data)) {
    return NextResponse.json({
      text:
        "Je suis spécialisé uniquement sur les actions, cryptos, ETF et marchés financiers.\n\n" +
        "Pose-moi une question BOURSE, par exemple :\n" +
        "• « Que penses-tu de APLD à court terme ? »\n" +
        "• « Cette action est-elle chère par rapport à ses bénéfices ? »\n" +
        "• « Comment diversifier mon portefeuille ? »",
      id: 'not-finance',
      role: 'assistant',
    });
  }

  // Contexte du titre sélectionné dans ton dashboard
  const contextStock = data.stockInfo
    ? `Titre suivi dans le dashboard : ${data.stockInfo.symbol}, prix ≈ ${data.stockInfo.price} USD, variation récente ≈ ${data.stockInfo.changePercent}%.`
    : "Aucun titre spécifique sélectionné dans le dashboard (utilise seulement la question de l'utilisateur).";

  const styleInstruction = buildStyleInstruction(mode);

  const systemPrompt = `
Tu es un assistant 100% spécialisé en bourse (actions, indices, ETF, cryptos).

Règles :
- Tu refuses poliment de répondre aux questions qui ne sont pas liées aux marchés financiers.
- Tu n'indiques jamais explicitement "achète" ou "vends". Tu parles plutôt de scénarios, de risques et de points à surveiller.
- Tu expliques clairement, comme à un étudiant niveau débutant/intermédiaire.
- Tu réponds toujours en français.

Style actuel : ${styleInstruction}

Contexte fourni par le dashboard :
${contextStock}
`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // IMPORTANT : modèle compatible avec ton SDK / v1beta
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // On envoie : 1) le "pseudo-system" en premier, 2) tout l'historique.
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
