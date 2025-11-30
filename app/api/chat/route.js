import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// IMPORTANT : On passe en mode "Edge" pour que le stream soit fluide
export const runtime = 'edge'; 
export const maxDuration = 30;

export async function POST(req) {
  try {
    const { messages, data } = await req.json();

    // On prépare le contexte financier
    const contextStock = data?.stockInfo 
      ? `Action: ${data.stockInfo.symbol}. Prix: ${data.stockInfo.price}$. Variation: ${data.stockInfo.changePercent}%.`
      : "Pas d'action sélectionnée.";

    // Appel standard à Google Gemini (Maintenant que ta clé marche, plus besoin de hacks !)
    const result = await streamText({
      model: google('gemini-1.5-flash'),
      // On utilise le 'system' standard qui est supporté par le nouveau SDK
      system: `Tu es un expert en bourse. Contexte actuel : ${contextStock}.
               Réponds en français, sois clair et utilise des emojis.`,
      messages,
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("ERREUR:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}