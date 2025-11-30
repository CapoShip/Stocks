import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req) {
  try {
    const { messages, data } = await req.json();

    const contextStock = data?.stockInfo 
      ? `CONTEXTE : Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$.`
      : "Pas d'action spécifique.";

    const result = await streamText({
      // CONFIGURATION SPÉCIALE : On désactive les filtres qui bloquent la finance
      model: google('gemini-1.5-flash', {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
      }),
      messages: [
        {
          role: 'user',
          content: `Tu es un expert en bourse. ${contextStock}. Réponds en français.`
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