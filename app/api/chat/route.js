import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Autorise le serveur à réfléchir pendant 30 secondes max
export const maxDuration = 30;

export async function POST(req) {
  try {
    // 1. Récupération du message
    const { messages, data } = await req.json();

    // 2. Construction du contexte
    const contextStock = data?.stockInfo 
      ? `Action: ${data.stockInfo.symbol}. Prix: ${data.stockInfo.price}$. Variation: ${data.stockInfo.changePercent}%`
      : "Pas d'action sélectionnée.";

    // 3. Appel à Google Gemini (VERSION CORRIGÉE)
    const result = await streamText({
      // On ajoute "-latest" pour forcer Google à trouver le modèle
      model: google('gemini-1.5-flash-latest'),
      system: `Tu es un assistant boursier expert. 
               Utilise ce contexte pour répondre : ${contextStock}.
               Réponds en français, sois concis et utilise des emojis.`,
      messages,
    });

    // 4. Envoi de la réponse
    return result.toDataStreamResponse();

  } catch (error) {
    console.error("ERREUR CHAT:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}