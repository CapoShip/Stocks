import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req) {
  try {
    const { messages } = await req.json();

    // On utilise gemini-1.5-flash, le modèle le plus stable et gratuit
    const result = await streamText({
      model: google('gemini-1.5-flash'),
      system: 'Tu es un assistant expert en bourse. Réponds en français.',
      messages,
    });

    return result.toDataStreamResponse();

  } catch (error) {
    // Ceci affichera l'erreur exacte dans les logs Vercel
    console.error("🛑 ERREUR GOOGLE:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}