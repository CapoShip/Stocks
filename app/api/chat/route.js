import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// IMPORTANT : Nous restons en mode Edge pour le streaming
export const runtime = 'edge'; 
export const maxDuration = 30;

export async function POST(req) {
  // Le try/catch est retiré pour laisser l'erreur simple de Google remonter
  const { messages, data } = await req.json();

  const contextStock = data?.stockInfo 
    ? `CONTEXTE : Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$.`
    : "Pas d'action spécifique.";

  const result = await streamText({
    model: google('gemini-1.5-flash', {
      // On garde les paramètres de sécurité désactivés pour que le texte passe
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      ],
    }),
    messages: [
      // On injecte les instructions comme un message utilisateur (méthode la plus stable)
      {
        role: 'user',
        content: `Tu es un expert en bourse. ${contextStock}. Réponds en français.`
      },
      ...messages
    ],
  });

  return result.toDataStreamResponse();
}