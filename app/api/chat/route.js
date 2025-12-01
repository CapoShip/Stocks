import { groq } from '@ai-sdk/groq'; 
import { generateText, convertToCoreMessages } from 'ai'; 
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req) {
  if (!process.env.GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: "Clé Groq manquante" }), { status: 500 });
  }

  let messages = []; // 👈 Initialise messages à un tableau vide ici
  let data = {};

  try {
    // 1. Tente d'analyser le corps de la requête
    const body = await req.json();
    
    // 2. Assure-toi que les propriétés existent, sinon elles restent un tableau vide ou un objet vide
    messages = body.messages || []; 
    data = body.data || {};
    
  } catch (e) {
    // Si le JSON est mal formé ou vide, on renvoie une erreur 400
    return new Response(JSON.stringify({ error: "Requête mal formée (JSON Invalide ou corps vide)" }), { status: 400 });
  }

  try {
    const contextStock = data.stockInfo ? `Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$.` : "Pas d'action.";

    const systemInstruction = `Tu es un expert en bourse. CONTEXTE: ${contextStock} Réponds en français.`;

    const history = convertToCoreMessages(messages); // Utilise le tableau garanti
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
    // Erreur de l'API Groq
    console.error("ERREUR CRITIQUE [FINAL]:", error);
    return new Response(JSON.stringify({ error: error.message || "Erreur inconnue de l'API" }), { status: 500 });
  }
}