import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req) {
  try {
    const { messages, data } = await req.json();

    // 1. On prépare le contexte
    const contextStock = data?.stockInfo 
      ? `CONTEXTE ACTUEL : Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$. Variation: ${data.stockInfo.changePercent}%.`
      : "Pas d'action spécifique sélectionnée.";

    // 2. Appel à Google Gemini
    // ASTUCE : On ne met PAS 'system' dans les messages, on le met dans la config
    const result = await streamText({
      model: google('gemini-1.5-flash'),
      prompt: `Tu es un expert en bourse. ${contextStock}. 
               Réponds aux questions de l'utilisateur de manière concise et en français. 
               Utilise des emojis.`, // On utilise 'prompt' ou on injecte le contexte autrement
      messages: messages.filter(m => m.role !== 'system'), // On nettoie les messages système pour éviter le bug
      system: `Tu es un expert en bourse. ${contextStock}`, // Nouvelle syntaxe supportée par le SDK V4
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("GROSSE ERREUR SERVEUR:", error);
    return new Response(JSON.stringify({ error: error.message || "Erreur inconnue" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}