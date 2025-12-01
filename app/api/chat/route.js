import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 30;

export async function POST(req) {
  try {
    const body = await req.json();

    const allMessages = Array.isArray(body?.messages) ? body.messages : [];
    const data = body?.data || {};

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Clé Gemini manquante" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 🔹 Modèle texte actuel (remplace 1.5-flash)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
     systemInstruction: `
Tu es un analyste financier professionnel (style Wall Street / Bloomberg).
Ton rôle est d’expliquer clairement et rapidement l’état d’une action.

🟦 STYLE À RESPECTER :
- Toujours répondre en français
- Ton ton doit être professionnel et moderne
- Phrase courtes
- Aération propre
- Sous-titres clairs
- Pas de texte inutile
- Pas de répétitions
- Toujours aller droit au but
- Utilise des 🔹•📉📈 pour rendre la réponse visuelle
- Jamais plus de 10 lignes par partie
- Jamais de paragraphe de 20 lignes

🟧 STRUCTURE À SUIVRE :
1) Résumé express (2 lignes max)
2) Analyse rapide 🔍
3) Points clés 📌
4) Risques ⚠️
5) Opportunités 🔥
6) Conclusion (recommandation : neutre / surveiller / opportunité)

🟥 INTERDIT :
- Pas de roman
- Pas de répétition des mêmes idées
- Pas de gros blocs de texte
- Pas de “si vous avez des questions” ou phrases inutiles

🟩 OBJECTIF :
Rendre la réponse belle, directe, lisible et pro. 
`.trim(),

    });

    // 🔹 Contexte boursier optionnel
    const stockContext = data?.stockInfo
      ? `Contexte: action ${data.stockInfo.symbol}, prix ${data.stockInfo.price}$, variation ${data.stockInfo.changePercent}%.`
      : "Aucune action précise n'est sélectionnée pour l'instant.";

    // Historique (sans "system")
    const historyMessages = allMessages.slice(0, -1);
    const lastMessage = allMessages[allMessages.length - 1];

    const history = historyMessages
      .filter(m => m && typeof m.content === "string")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const userText =
      (lastMessage && lastMessage.content) ||
      "Analyse brièvement la situation de marché avec le contexte suivant : " +
        stockContext;

    const chat = model.startChat({ history });

    // On injecte le contexte dans le message
    const result = await chat.sendMessage(
      stockContext + "\n\nQuestion de l'utilisateur :\n" + userText
    );

    const aiText = result.response.text();

    return NextResponse.json({
      text: aiText,
      id: "gemini-25-flash-lite-" + Date.now(),
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
