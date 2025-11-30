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
      // ON UTILISE LE MODÈLE CLASSIQUE (Le plus compatible)
      model: google('gemini-pro'),
      system: `Tu es un assistant boursier. Contexte : ${contextStock}`,
      messages,
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("ERREUR CHAT:", error);
    // On renvoie une erreur propre
    return new Response(JSON.stringify({ error: "Erreur IA: " + error.message }), { status: 500 });
  }
}