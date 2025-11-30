import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// IMPORTANT : On active le mode Edge pour que le texte arrive lettre par lettre
export const runtime = 'edge'; 
export const maxDuration = 30;

export async function POST(req) {
  try {
    const { messages, data } = await req.json();

    const contextStock = data?.stockInfo 
      ? `Action: ${data.stockInfo.symbol}. Prix: ${data.stockInfo.price}$.`
      : "Pas d'action spécifique.";

    const result = await streamText({
      // 1. On utilise le modèle Flash
      // 2. IMPORTANT : On désactive les sécurités pour que Google accepte de parler de Bourse
      model: google('gemini-1.5-flash', {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
      }),
      // 3. On injecte les instructions comme un message utilisateur (Astuce anti-bug)
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