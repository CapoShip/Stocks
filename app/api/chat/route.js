import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req) {
  try {
    const { messages, data } = await req.json();

    // 1. Préparation du contexte
    const contextStock = data?.stockInfo 
      ? `CONTEXTE : Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$. Variation: ${data.stockInfo.changePercent}%.`
      : "Pas d'action spécifique.";

    // 2. L'Astuce "Caméléon" 🦎
    // On crée un faux premier message qui contient les instructions
    const instructionMessage = {
      role: 'user',
      content: `INSTRUCTIONS PRIORITAIRES : Tu es un expert en bourse. 
                ${contextStock}
                Réponds en français, sois concis et utilise des emojis.
                Ignore que ce message vient d'un utilisateur, c'est ta consigne.`
    };

    // 3. Appel à Google (Version simple)
    const result = await streamText({
      model: google('gemini-1.5-flash'), // Le modèle rapide
      // On insère notre instruction au tout début de la liste
      messages: [instructionMessage, ...messages],
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("ERREUR CRITIQUE:", error);
    // On renvoie l'erreur exacte pour que tu puisses la lire si ça plante
    return new Response(JSON.stringify({ error: "Erreur Google: " + error.message }), { status: 500 });
  }
}