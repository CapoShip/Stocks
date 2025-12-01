import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 30;

export async function POST(req) {
  try {
    const body = await req.json();

    // Historique envoyé par le front
    const allMessages = Array.isArray(body?.messages) ? body.messages : [];
    const data = body?.data || {};

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Clé Gemini manquante" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 🔹 Contexte boursier
    const stockContext = data?.stockInfo
      ? `Action analysée: ${data.stockInfo.symbol}, prix actuel ${data.stockInfo.price}$, variation ${data.stockInfo.changePercent}%.`
      : "Aucune action spécifique sélectionnée pour l'instant.";

    // 🔹 System prompt → via systemInstruction (PAS dans l'historique)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",  // ou "gemini-1.5-flash" si tu veux le gratuit
      systemInstruction: `
Tu es un expert en bourse et en analyse fondamentale et technique.
Tu expliques toujours en français, clairement et pédagogiquement.
Tu peux commenter les actions, le risque, l'horizon d'investissement, et proposer des scénarios.
Contexte de marché : ${stockContext}
Si l'utilisateur parle d'autre chose que la bourse, réponds normalement en français.
`.trim(),
    });

    // 🔹 On sépare l'historique du DERNIER message
    const historyMessages = allMessages.slice(0, -1);
    const lastMessage = allMessages[allMessages.length - 1];

    const history = historyMessages
      .filter(m => m && typeof m.content === "string")
      .map(m => ({
        // Gemini n'accepte que "user" | "model"
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    // Si jamais il n'y a pas de dernier message (cas extrême)
    const userText =
      (lastMessage && lastMessage.content) ||
      "Explique-moi brièvement la situation de ce titre.";

    const chat = model.startChat({ history });

    const result = await chat.sendMessage(userText);
    const aiText = result.response.text();

    return NextResponse.json({
      text: aiText,
      id: "gemini-" + Date.now(),
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
