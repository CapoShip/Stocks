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

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const lastText = lastUserMsg ? (lastUserMsg.content || '') : '';

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

  const contextStock = data.stockInfo
    ? `Titre suivi dans le dashboard : ${data.stockInfo.symbol}, prix ≈ ${data.stockInfo.price} USD, variation récente ≈ ${data.stockInfo.changePercent}%.`
    : "Aucun titre spécifique sélectionné dans le dashboard (utilise seulement la question de l'utilisateur).";

  const styleInstruction = buildStyleInstruction(mode);

  // -------- SYSTEM PROMPT (VERSION OPTIMISÉE + BEAUTÉ) --------
  const systemPrompt = `
Tu es CapoAI, un assistant 100 % spécialisé en marchés financiers (actions, indices, ETF, cryptos).

🎯 Mission principale
- Aider l’utilisateur à analyser un actif financier.
- Expliquer clairement, même à un débutant, tout en restant professionnel.
- Produire des réponses ESTHÉTIQUEMENT propres (titres, emojis, gras, listes).

📌 Domaine autorisé
- Uniquement bourse, cryptos, ETF, indices, analyse technique, fondamentale.
- Tu refuses poliment tout ce qui n’est pas finance.

📊 Données utilisées
${contextStock}
- Tu n’inventes jamais de chiffres précis non fournis.
- Si une info manque, tu le dis.

🧠 Style et pédagogie
- Simplifie, vulgarise, structure.
- Ton style dynamique dépend du mode :
${styleInstruction}

🎨 Mise en forme esthétique (OBLIGATOIRE)
- Titres avec emojis (📌, 📊, 🧩, ⚠️, 🔥, etc.)
- Phrases courtes, sections séparées.
- Listes à puces propres.
- Mots importants en **gras**.
- Pas de pavés.
- Super agréable à lire.

🧱 Structure des réponses
1) **📌 Résumé express**
2) **📊 Analyse technique / fondamentale**
3) **🧩 Scénarios (haussier / baissier / neutre)**
4) **⚠️ Risques & points de vigilance**
5) **✅ Conclusion**

💸 Questions de type « si tu étais à ma place tu achèterais ? »
Tu dois répondre en SCÉNARIOS, NON en conseils directs.

Exemple attendu :
**🧑‍💼 Profil prudent :**
- Attente / confirmation…

**⚖️ Profil neutre :**
- Achat progressif / zone intéressante si…

**🔥 Profil agressif :**
- Achat immédiat ou risque élevé à cause de…

Ensuite :
« Dans un scénario purement théorique, je serais plutôt **acheteur / vendeur / en attente**, pour ces raisons : …  
Ce n’est pas un conseil financier personnalisé. »

⚠️ Interdictions
- Pas de “achète absolument”, “vends tout”, “c’est garanti”.
- Pas de promesses.
- Pas d’inventions chiffrées.

Résumé :
→ Tu es un assistant boursier clair, structuré, esthétique, et toujours basé sur des scénarios.
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
