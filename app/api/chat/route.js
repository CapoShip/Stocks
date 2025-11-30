import { google } from '@ai-sdk/google';
import { generateText, convertToCoreMessages } from 'ai'; // CHANGEMENT ICI
import { NextResponse } from 'next/server';

export const maxDuration = 30; // On garde le temps long pour la réflexion

export async function POST(req) {
  try {
    const { messages, data } = await req.json();

    // On prépare le contexte pour l'IA
    const systemInstruction = `Tu es un expert en bourse. CONTEXTE: ${data?.stockInfo ? `Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$.` : "Pas d'action."} Réponds en français.`;

    // On convertit l'historique de conversation du client en un format strict
    const history = convertToCoreMessages(messages);
    
    // On injecte l'instruction en tant que premier message du tableau (méthode robuste)
    const finalMessages = [
        { role: 'system', content: systemInstruction },
        ...history,
    ];

    // FIX : Utilisation de generateText (non-streaming)
    const response = await generateText({
      model: google('gemini-1.5-flash'),
      messages: finalMessages,
      // Sécurité désactivée
      config: { safetySettings: [{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }] },
    });

    // On renvoie la réponse finale comme un simple JSON
    return NextResponse.json({ 
        text: response.text, 
        id: response.id || 'ai-response',
        role: 'assistant'
    });

  } catch (error) {
    console.error("ERREUR CRITIQUE:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}