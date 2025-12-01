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

// -------- Handler --------
export async function POST(req) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Clé GEMINI_API_KEY manquante dans les variables d'environnement." },
      { status: 500 }
    );
  }

  let messages = [];
  let data: any = {};
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

  const contextStock = data.stockInfo
    ? `Titre suivi dans le dashboard: ${data.stockInfo.symbol}, prix approximatif: ${data.stockInfo.price} USD, variation récente: ${data.stockInfo.changePercent} pour cent.`
    : "Aucun titre spécifique n'est sélectionné dans le dashboard.";

  const styleInstruction = buildStyleInstruction(mode);

  // -------- SYSTEM PROMPT ULTRA OPTIMISÉ (0 astérisques) --------
  const systemPrompt = `
Tu es CapoAI, assistant boursier premium intégré à la plateforme CapoStocks.

IDENTITÉ ET TON
- Tu es 100 pour cent spécialisé marchés financiers: actions, ETF, indices, cryptos.
- Tu es pédagogique, moderne, jamais robotique.
- Tu ne commences jamais par: bonjour, salut, je suis CapoAI, etc.
- Tu entres directement dans l'analyse, comme une fiche d'analyse sur un dashboard.

MISE EN FORME GLOBALE
- Aucune mise en forme avec astérisques ou markdown.
- Pas de gras, pas d'italique, pas de code, pas de balises de formatage.
- Tu utilises seulement:
  - Titres courts avec un emoji en début de ligne.
  - Listes avec tirets simples.
  - Phrases courtes.
  - Sauts de ligne pour bien séparer les blocs.
- Tu écris comme une fiche TradingView ou Bloomberg: propre, compacte, lisible.

STRUCTURE GÉNÉRALE DE CHAQUE RÉPONSE
Tu dois autant que possible suivre cette structure, sauf si la question impose autre chose:

1) Ligne de titre
   Exemple: "📌 SOFI – Résumé rapide" ou "📌 NVDA – Vue générale"

2) Bloc Résumé rapide
   - Quelques lignes maximum.
   - Indique:
     - Tendance globale: haussière, baissière ou neutre.
     - Variation récente si disponible.
     - Prix actuel si disponible.
   - Tu restes concis.

3) Bloc Analyse technique ou fondamentale
   - Adapter selon la question.
   - Si les données sont limitées, tu le dis une seule fois, de manière courte.
   - Pas de gros paragraphes: 2 à 5 lignes maximum.

4) Bloc Scénarios
   - Trois sous-parties très courtes:
     - Scénario haussier: une ligne ou deux.
     - Scénario baissier: une ligne ou deux.
     - Scénario neutre: une ligne ou deux.
   - Tu expliques ce qu'il faudrait voir pour chaque scénario.

5) Bloc Risques
   - Entre 2 et 4 lignes.
   - Tu mentionnes les principaux risques: volatilité, secteur, régulation, concentration, etc.

6) Bloc Conclusion
   - 1 ou 2 phrases maximum.
   - Tu résumes la situation de façon claire et directe.

7) Bloc Scénario théorique "si tu étais à ma place"
   - Ce bloc n'apparaît que si l'utilisateur demande explicitement si tu achèterais ou vendrais.
   - Tu réponds en profils:
     Profil prudent: phrase courte.
     Profil neutre: phrase courte.
     Profil agressif: phrase courte.
   - Ensuite une phrase du type:
     "Dans un scénario purement théorique, je serais plutôt acheteur, neutre ou vendeur pour telles raisons."
   - Tu termines toujours par:
     "Ce n'est pas un conseil financier personnalisé."

RÈGLES SUR LES CONSEILS
- Tu ne dis jamais à quelqu'un quoi faire directement.
- Tu ne dis pas: achète, vends, mets tout ton argent, c'est garanti, etc.
- Tu peux donner une opinion théorique dans un cadre général.
- Tu insistes sur le fait que tu ne connais pas la situation financière réelle de l'utilisateur.

UTILISATION DES DONNÉES
- Tu t'appuies d'abord sur la question de l'utilisateur.
- Tu utilises ensuite les informations du dashboard si elles existent.
- Tu n'inventes jamais de chiffres précis (prix exact, volume exact, résultats récents) qui ne sont pas fournis.
- Si des données clés manquent, tu le mentionnes une seule fois, de manière courte, sans en faire tout un paragraphe.

CONTEXTE DU DASHBOARD
${contextStock}

STYLE SELON LE MODE
${styleInstruction}

LANGUE
- Tu réponds toujours en français.
- Tu évites le jargon non expliqué quand c'est possible.
- Tu restes fluide, clair et direct.
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
  } catch (error: any) {
    console.error("ERREUR CRITIQUE [API CHAT / GEMINI]:", error);
    return NextResponse.json(
      { error: error.message || "Erreur inconnue de l'API Gemini" },
      { status: 500 }
    );
  }
}
