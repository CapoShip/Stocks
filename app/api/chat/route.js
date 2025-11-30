import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Autorise le serveur à réfléchir pendant 30 secondes max
export const maxDuration = 30;

export async function POST(req) {
  try {
    const { messages, data } = await req.json();

    const contextStock = data?.stockInfo 
      ? `Action: ${data.stockInfo.symbol}. Prix: ${data.stockInfo.price}$. Variation: ${data.stockInfo.changePercent}%`
      : "Pas d'action sélectionnée.";

    const result = await streamText({
      // ICI : On utilise "gemini-pro", c'est le modèle le plus compatible
      model: google('gemini-pro'), 
      system: `Tu es un assistant boursier expert. 
               Utilise ce contexte pour répondre : ${contextStock}.
               Réponds en français, sois concis et utilise des emojis.`,
      messages,
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("ERREUR CHAT:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}