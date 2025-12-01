import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 30;

// 🔹 Règle générale : spécialisé bourse uniquement
const BASE_PROMPT = `
Tu es un assistant spécialisé EXCLUSIVEMENT en bourse, marchés financiers et investissement.

TU DOIS :
- Répondre uniquement si la question a un lien clair avec :
  - actions, indices, ETF, obligations, crypto,
  - entreprises cotées, résultats financiers,
  - analyse fondamentale ou technique,
  - gestion de portefeuille, risques, macroéconomie liée aux marchés.
- Adapter ton style et ta structure à la question posée :
  - si c'est une définition → réponse courte et claire,
  - si c'est une analyse d'une action précise → réponse plus détaillée,
  - si c'est une stratégie → expliquer étapes / avantages / risques.
- Utiliser un français naturel, moderne, clair.
- Éviter de répéter les mêmes phrases d’une réponse à l’autre.
- Utiliser des listes à puces seulement quand c’est utile, pas systématiquement.
- Aller droit au but, pas de blabla inutile.

INTERDICTION :
- Si la question n’a pas de rapport avec la bourse, les marchés ou l’investissement,
  tu NE DOIS PAS répondre normalement.
  Tu réponds UNIQUEMENT cette phrase courte (sans rien ajouter d’autre) :
  "Je suis spécialisé en bourse. Pose-moi une question liée aux actions ou aux marchés financiers."
`.trim();

// 🔹 Styles optionnels (modes) – influencent le ton, pas une structure fixe
const MODE_STYLES = {
  pro: `
STYLE: Analyste professionnel.
- Ton sérieux, structuré, concis.
- Tu peux utiliser quelques titres/bullets si ça aide la compréhension.
`.trim(),

  yt: `
STYLE: Créateur YouTube finance.
- Ton dynamique et pédagogique, avec quelques emojis (🔥📈📉⚠️) mais sans abus.
- Tu vulgarises pour que ça reste accessible.
`.trim(),

  buffett: `
STYLE: Investisseur long terme (type Warren Buffett).
- Tu te concentres surtout sur le business, le long terme, la qualité de l'entreprise.
- Ton posé, calme, sans panique court terme.
`.trim(),

  technical: `
STYLE: Trader technique.
- Tu te concentres surtout sur le graphique : tendance, supports, résistances, indicateurs.
- Tu restes dans le domaine de l'analyse technique, sans trop parler de fondamentaux.
`.trim(),

  short: `
STYLE: Réponse ultra courte.
- Maximum 5 à 8 phrases.
- Pas de titres, pas de listes, tu vas droit au but.
`.trim(),
};

export async function POST(req) {
  try {
    const body = await req.json();

    const allMessages = Array.isArray(body?.messages) ? body.messages : [];
    const data = body?.data || {};
    const mode = body?.mode && MODE_STYLES[body.mode] ? body.mode : "pro";
    const modeStyle = MODE_STYLES[mode] || MODE_STYLES.pro;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Clé Gemini manquante" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 🔹 Modèle Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: `
${BASE_PROMPT}

${modeStyle}

Contexte éventuel de l'action (si présent) :
${
  data?.stockInfo
    ? `- Symbole : ${data.stockInfo.symbol}
- Prix actuel : ${data.stockInfo.price} $
- Variation récente : ${data.stockInfo.changePercent}%`
    : `Aucune action spécifique n'est fournie, tu réponds en fonction de la question.`
}
`.trim(),
    });

    // 🔹 Historique : tout sauf le dernier message (le dernier = message actuel)
    const historyMessages = allMessages.slice(0, -1);
    const lastMessage = allMessages[allMessages.length - 1];

    const history = historyMessages
      .filter((m) => m && typeof m.content === "string")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const userText =
      (lastMessage && lastMessage.content) ||
      "Réponds à la question de l'utilisateur sur la bourse.";

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.5,          // un peu de variété, mais pas trop random
        maxOutputTokens: 800,
      },
    });

    const result = await chat.sendMessage(userText);
    const aiText = result.response.text();

    return NextResponse.json({
      text: aiText,
      id: `gemini-${mode}-${Date.now()}`,
      role: "assistant",
    });
  } catch (error) {
    console.error("Erreur Gemini:", error);
    return NextResponse.json(
      { error: error.message || "Erreur inconnue de l'API Gemini" },
      { status: 500 }
    );
  }
}
