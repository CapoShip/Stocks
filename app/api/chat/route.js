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

    // 🔹 modèle gratuit & supporté
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `
Tu es un expert en bourse et en analyse fondamentale/technique.
Tu expliques toujours en français, clairement et pédagogiquement.
Si l'utilisateur parle d'autre chose que la bourse, réponds normalement en français.
`.trim(),
    });

    // 🔹 contexte boursier (facultatif mais utile)
    const stockContext = data?.stockInfo
      ? `Contexte: action ${data.stockInfo.symbol}, prix ${data.stockInfo.price}$, variation ${data.stockInfo.changePercent}%.`
      : "Aucune action précise n'est sélectionnée pour l'instant.";

    // historique (sans "system")
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

    // on ajoute le contexte dans le dernier message
    const result = await chat.sendMessage(
      stockContext + "\n\nQuestion de l'utilisateur :\n" + userText
    );

    const aiText = result.response.text();

    return NextResponse.json({
      text: aiText,
      id: "gemini-flash-" + Date.now(),
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
