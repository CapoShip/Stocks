import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// 🚀 FIX FINAL : On active le mode Edge pour garantir un stream non mis en mémoire tampon
export const runtime = 'edge'; 
export const maxDuration = 30;

export async function POST(req) {
  // ... (tout le reste du code reste le même, y compris la logique d'injection des messages)
  try {
    const { messages, data } = await req.json();

    const contextStock = data?.stockInfo 
      ? `CONTEXTE ACTUEL : Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$.`
      : "Pas d'action spécifique.";

    const result = await streamText({
      model: google('gemini-1.5-flash'),
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
          content: `Tu es un expert en bourse. ${contextStock}. Réponds en français.`
        },
        ...messages
      ],
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("ERREUR:", error);
    // On retire le code de debug pour revenir à un serveur propre
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}