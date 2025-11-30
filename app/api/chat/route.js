import { groq } from '@ai-sdk/groq'; 
import { generateText, convertToCoreMessages } from 'ai'; 
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req) {
  if (!process.env.GROQ_API_KEY) {
    console.error("ERREUR : Clé Groq manquante sur le serveur.");
    return new Response(JSON.stringify({ error: "Clé API Groq manquante" }), { status: 500 });
  }

  try {
    const { messages, data } = await req.json();

    const contextStock = data?.stockInfo ? `Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$.` : "Pas d'action.";

    const systemInstruction = `Tu es un expert en bourse. CONTEXTE: ${contextStock} Réponds en français.`;

    const history = convertToCoreMessages(messages);
    const finalMessages = [{ role: 'system', content: systemInstruction }, ...history];
    
    // ✅ Le modèle V5 que nous voulons
    const response = await generateText({
      model: groq('llama3-8b-8192'), 
      messages: finalMessages,
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