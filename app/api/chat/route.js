import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req) {
  try {
    const { messages, data } = await req.json();

    const contextStock = data?.stockInfo 
      ? `Action: ${data.stockInfo.symbol}. Prix: ${data.stockInfo.price}$.`
      : "Pas d'action sélectionnée.";

    const result = await streamText({
      model: google('gemini-1.5-flash'), // Avec la nouvelle clé, ça DOIT marcher
      messages: [
        { role: 'system', content: `Tu es un expert en bourse. Contexte: ${contextStock}` },
        ...messages
      ],
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("ERREUR:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}