import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req) {
  try {
    const { messages, data } = await req.json();

    // 1. On prépare le contexte
    const contextStock = data?.stockInfo 
      ? `CONTEXTE : Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$.`
      : "Pas d'action spécifique.";

    // 2. On triche un peu : on crée un "faux" message utilisateur
    // qui contient les instructions. Google comprend ça parfaitement.
    const initialInstruction = {
      role: 'user',
      content: `Tu es un expert en bourse. ${contextStock}. 
                Réponds en français, sois concis.`
    };

    // 3. On combine tout ça
    const finalMessages = [initialInstruction, ...messages];

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      messages: finalMessages,
      // ⚠️ ON RETIRE LA LIGNE 'SYSTEM' ICI, C'EST ELLE QUI BLOQUE L'AFFICHAGE
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("ERREUR:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}