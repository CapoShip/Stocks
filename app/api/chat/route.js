import { groq } from '@ai-sdk/groq'; 
import { generateText, convertToCoreMessages } from 'ai'; 
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req) {
  if (!process.env.GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: "Clé Groq manquante" }), { status: 500 });
  }

  let body;
  try {
    // 1. Tente d'analyser le corps de la requête
    body = await req.json();
  } catch (e) {
    // Si le JSON est mal formé ou vide, on renvoie une erreur client 400
    return new Response(JSON.stringify({ error: "Requête mal formée (JSON Invalide)" }), { status: 400 });
  }

  try {
    // 🛑 LE CORRECTIF DÉFENSIF FINAL : Assurer que 'messages' est un tableau
    const { messages, data } = body;
    const cleanMessages = messages || []; 

    const contextStock = data?.stockInfo ? `Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$.` : "Pas d'action.";

    const systemInstruction = `Tu es un expert en bourse. CONTEXTE: ${contextStock} Réponds en français.`;

    const history = convertToCoreMessages(cleanMessages); // Maintenant, on est sûr que c'est un tableau
    const finalMessages = [{ role: 'system', content: systemInstruction }, ...history];
    
    const response = await generateText({
      model: groq('llama2-70b-4096'), 
      messages: finalMessages,
    });

    return NextResponse.json({ 
        text: response.text, 
        id: response.id || 'ai-response',
        role: 'assistant'
    });

  } catch (error) {
    // Si on arrive ici, c'est que Groq a planté ou la clé est mauvaise.
    console.error("ERREUR CRITIQUE [FINAL]:", error);
    return new Response(JSON.stringify({ error: error.message || "Erreur inconnue" }), { status: 500 });
  }
}