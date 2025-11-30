import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// On force l'utilisation de Node.js pour éviter les bugs du mode Edge
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req) {
  try {
    const { messages, data } = await req.json();

    // 1. Contexte simplifié
    const contextStock = data?.stockInfo 
      ? `Action: ${data.stockInfo.symbol} (${data.stockInfo.price}$)`
      : "Pas d'action.";

    // 2. Appel Google avec Paramètres de Sécurité DÉSACTIVÉS (Crucial)
    const result = await streamText({
      model: google('gemini-1.5-flash'),
      // On désactive TOUS les filtres de sécurité qui bloquent souvent la finance
      settings: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
      },
      messages: [
        {
          role: 'user',
          content: `Tu es un expert bourse. ${contextStock}. Réponds en français.`
        },
        ...messages
      ],
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("CRASH SERVEUR:", error);
    
    // ASTUCE DE DEBUG : On renvoie l'erreur sous forme de texte pour que tu la lises !
    return new Response(
      `ERREUR TECHNIQUE DÉTECTÉE : ${error.message || error.toString()}`, 
      { status: 200 } // On ment en disant que c'est OK pour afficher le texte
    );
  }
}