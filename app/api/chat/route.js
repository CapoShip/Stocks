import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req) {
  try {
    const { messages, data } = await req.json();

    const contextStock = data?.stockInfo 
      ? `CONTEXTE : Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$. Variation: ${data.stockInfo.changePercent}%.`
      : "Pas d'action spécifique.";

    // On utilise le modèle Flash qui est gratuit et rapide
    const result = await streamText({
      model: google('gemini-1.5-flash'),
      messages: [
        // On injecte les instructions comme un "faux" premier message pour éviter les bugs
        {
          role: 'user',
          content: `Tu es un expert en bourse. ${contextStock}. Réponds en français avec des emojis.`
        },
        ...messages
      ],
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("ERREUR:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}