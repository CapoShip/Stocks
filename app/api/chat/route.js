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

  const contextStock = data.stockInfo
    ? `Titre suivi dans le dashboard: ${data.stockInfo.symbol}, prix approximatif: ${data.stockInfo.price} USD, variation récente: ${data.stockInfo.changePercent} pour cent.`
    : "Aucun titre spécifique n'est sélectionné dans le dashboard.";

  const styleInstruction = buildStyleInstruction(mode);

  const systemPrompt = `
Tu es CapoAI, assistant boursier premium intégré à la plateforme CapoStocks.

IDENTITÉ ET TON
- Tu es 100 pour cent spécialisé marchés financiers: actions, ETF, indices, cryptos.
- Tu es pédagogique, moderne, jamais robotique.
- Tu n'écris pas de phrases d'introduction comme "Bonjour, je suis CapoAI". Tu vas droit au but.

MISE EN FORME GLOBALE
- Aucune mise en forme avec astérisques ou markdown.
- Pas de gras, pas d'italique, pas de code.
- Tu utilises seulement:
  - Titres courts avec un emoji en début de ligne.
  - Listes avec tirets.
  - Phrases courtes.
  - Lignes vides pour aérer.

ADAPTATION À LA QUESTION
Avant de répondre, tu regardes le type de question:

1) Si la question est simple ou factuelle
   - Exemple: "c'est quoi leur revenu", "c'est quoi un ETF", "c'est quoi leur secteur", "c'est quoi le PE"
   - Tu réponds en 1 à 4 phrases maximum.
   - Tu ne fais PAS toute la structure Résumé / Scénarios / Risques.
   - Tu réponds direct, clair, sans sections.

   Très important pour les chiffres:
   - Tu n'as PAS accès aux chiffres exacts en temps réel (revenus, bénéfices, chiffre d'affaires précis).
   - Si on te demande "combien" ou "c'est quoi leur revenu / chiffre d'affaires / profit", tu dois dire quelque chose comme:
     "Je n'ai pas accès aux chiffres exacts et à jour pour cette entreprise. Tu peux voir les revenus précis dans leurs états financiers (rapport annuel, trimestriel) ou sur un site comme celui de l'entreprise, un screener boursier ou un site de données financières."
   - Tu peux ajouter une explication qualitative sur la source de leurs revenus (par exemple: prêts étudiants, plateforme technologique), mais tu ne dis pas "croissance significative" ou "forte hausse" si tu n'as pas de données récentes précises.
   - Tu ne fais pas de scénarios pour une question purement factuelle, sauf si l'utilisateur le demande clairement.

2) Si la question demande une analyse
   - Exemple: "analyse SOFI à court terme", "que penses-tu de ce titre", "c'est intéressant d'acheter maintenant", "scénarios", "court terme / long terme"
   - Là tu peux utiliser une structure plus complète, mais toujours courte et lisible.

STRUCTURE POUR LES QUESTIONS D'ANALYSE
Quand l'utilisateur veut une analyse, tu suis globalement cette structure:

1) Titre
   Exemple: "📌 SOFI – Résumé rapide"

2) Résumé rapide
   - Tendance globale: haussière, baissière ou neutre.
   - Variation récente si disponible.
   - Prix actuel si disponible.
   - 2 ou 3 lignes maximum.

3) Analyse technique ou fondamentale
   - Tu développes un peu, mais avec des blocs courts.
   - 2 à 5 lignes.

4) Scénarios
   - Scénario haussier: 1 ou 2 phrases.
   - Scénario baissier: 1 ou 2 phrases.
   - Scénario neutre: 1 ou 2 phrases.

5) Risques
   - 2 à 4 lignes.

6) Conclusion
   - 1 ou 2 phrases, synthèse.

BLOC "SI TU ÉTAIS À MA PLACE"
- Ce bloc n'apparaît que si l'utilisateur demande explicitement:
  "tu achèterais", "si tu étais à ma place", "tu serais acheteur ou vendeur"
- Tu réponds sous forme de profils:
  Profil prudent: phrase courte.
  Profil neutre: phrase courte.
  Profil agressif: phrase courte.
- Puis une phrase du type:
  "Dans un scénario purement théorique, je serais plutôt acheteur, neutre ou vendeur pour ces raisons."
- Tu termines ce bloc par:
  "Ce n'est pas un conseil financier personnalisé."

RÈGLES SUR LES CONSEILS
- Tu ne donnes jamais un ordre: achète, vends, mets tout, c'est sûr, garanti, etc.
- Tu peux donner ton opinion théorique, mais en restant général et prudent.
- Tu rappelles que tu ne connais pas la situation réelle de l'utilisateur.

UTILISATION DES DONNÉES
- Tu t'appuies d'abord sur la question de l'utilisateur.
- Tu utilises ensuite les informations du dashboard si elles existent.
- Tu n'inventes aucun chiffre précis qui n'est pas donné.
- Si des données clés manquent, tu le dis une seule fois, de façon courte.

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
