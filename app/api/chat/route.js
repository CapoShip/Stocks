import { groq } from '@ai-sdk/groq'; // 👈 Nouveau fournisseur
import { generateText, convertToCoreMessages } from 'ai'; 
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req) {
  // CRUCIAL : La clé doit être la clé Groq (gsk-...)
  if (!process.env.GROQ_API_KEY) {
    console.error("ERREUR : Clé Groq manquante sur le serveur.");
    return new Response(JSON.stringify({ error: "Clé API Groq manquante" }), { status: 500 });
  }

  try {
    const { messages, data } = await req.json();

    const systemInstruction = `Tu es un expert en bourse. CONTEXTE: ${data?.stockInfo ? `Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$.` : "Pas d'action."} Réponds en français.`;

    const history = convertToCoreMessages(messages);
    const finalMessages = [{ role: 'system', content: systemInstruction }, ...history];
    
    // FIX FINAL : Utilisation de Groq (Llama 3)
    const response = await generateText({
      model: groq('llama3-8b-8192'), // Modèle Llama 3 rapide
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