import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// ON RETIRE LA LIGNE "EDGE" pour utiliser le mode Node.js (plus stable pour Gemini)
export const maxDuration = 30;

export async function POST(req) {
  try {
    const { messages, data } = await req.json();

    const contextStock = data?.stockInfo 
      ? `Action: ${data.stockInfo.symbol}. Prix: ${data.stockInfo.price}$. Variation: ${data.stockInfo.changePercent}%.`
      : "Pas d'action sélectionnée.";

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      system: `Tu es un expert en bourse. Contexte : ${contextStock}. Réponds en français avec des emojis.`,
      messages,
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("ERREUR:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}