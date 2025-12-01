import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 30;

export async function POST(req) {
  try {
    const body = await req.json();

    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const data = body?.data || {};

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Clé Gemini manquante" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",  // ⭐ GRATUIT
    });

    // Contexte si une action est en cours
    const context = data?.stockInfo
      ? `Analyse actuelle : ${data.stockInfo.symbol}, prix ${data.stockInfo.price} USD, variation ${data.stockInfo.changePercent}%`
      : "Aucune action sélectionnée.";

    // Reconstruction de l'historique
    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const chat = model.startChat({
      history: [
        {
          role: "system",
          parts: [{ text: `Tu es un expert en bourse. Toujours répondre en français. ${context}` }]
        },
        ...history,
      ],
    });

    const userMessage = body.messages[body.messages.length - 1]?.content || "";

    const response = await chat.sendMessage(userMessage);

    const aiText = response.response.text();

    return NextResponse.json({
      text: aiText,
      id: "gemini-" + Date.now(),
    });

  } catch (error) {
    console.error("Erreur Gemini:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
