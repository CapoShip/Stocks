import { google } from '@ai-sdk/google';
import { generateText, convertToCoreMessages } from 'ai'; // CHANGEMENT CRUCIAL ICI
import { NextResponse } from 'next/server';

export const maxDuration = 30; // On garde le temps long

export async function POST(req) {
  try {
    const { messages, data } = await req.json();

    const systemInstruction = `Tu es un expert en bourse. CONTEXTE: ${data?.stockInfo ? `Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$.` : "Pas d'action."} Réponds en français.`;

    // On prépare l'historique de conversation
    const history = convertToCoreMessages(messages);
    const finalMessages = [{ role: 'system', content: systemInstruction }, ...history];
    
    // FIX : Utilisation de generateText (NON-STREAMING)
    const response = await generateText({
      model: google('gemini-1.5-flash'),
      messages: finalMessages,
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
    return new Response(JSON.stringify({ error: error.message || "Erreur inconnue" }), { status: 500 });
  }
}