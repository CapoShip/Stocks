import { google } from '@ai-sdk/google';
import { generateText, convertToCoreMessages } from 'ai'; 
import { NextResponse } from 'next/server';

export const maxDuration = 30; 

export async function POST(req) {
  try {
    const { messages, data } = await req.json();

    const systemInstruction = `Tu es un expert en bourse. CONTEXTE: ${data?.stockInfo ? `Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$.` : "Pas d'action."} Réponds en français.`;

    const history = convertToCoreMessages(messages);
    const finalMessages = [{ role: 'system', content: systemInstruction }, ...history];
    
    // FIX FINAL : Utilisation du modèle 1.0 Pro (stable sur tous les comptes)
    const response = await generateText({
      model: google('gemini-1.0-pro'), // 👈 Changement ici
      messages: finalMessages,
      config: { safetySettings: [{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }] },
    });

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