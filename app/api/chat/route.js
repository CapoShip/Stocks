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
    const result = await streamText({
      model: google('gemini-1.5-flash'),
      
      // ✅ C'est ICI la correction : On utilise "system" (et on supprime "prompt" qui faisait planter)
      system: `Tu es un expert en bourse. ${contextStock}. 
               Réponds aux questions de l'utilisateur de manière concise et en français. 
               Utilise des emojis.`,
      
      messages, // On passe l'historique de la conversation
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("ERREUR SERVEUR:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}