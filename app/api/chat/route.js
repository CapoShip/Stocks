import { groq } from '@ai-sdk/groq'; 
import { generateText, convertToCoreMessages } from 'ai'; 
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req) {
  if (!process.env.GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: "Clé Groq manquante" }), { status: 500 });
  }

  let messages = []; // 🛑 INITIALISATION DE SECURITE #1
  let data = {};     // Initialisation de l'objet de données
  let body;

  try {
    // 1. Lecture du corps de la requête
    body = await req.json();
    
    // 2. Assignation des valeurs, avec protection contre null/undefined
    messages = body.messages || []; // 🛑 PROTECTION FINALE
    data = body.data || {};

  } catch (e) {
    // Si le JSON est mal formé ou vide (client envoie un corps bizarre)
    return new Response(JSON.stringify({ error: "Requête mal formée (Le corps JSON est invalide)" }), { status: 400 });
  }

  try {
    // Assigner les données du contexte (maintenant que nous sommes sûrs que 'data' est un objet)
    const contextStock = data.stockInfo ? `Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$.` : "Pas d'action.";

    const systemInstruction = `Tu es un expert en bourse. CONTEXTE: ${contextStock} Réponds en français.`;

    const history = convertToCoreMessages(messages); // Utilisation de l'array garanti
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
    console.error("ERREUR CRITIQUE [MAP CRASH]:", error);
    return new Response(JSON.stringify({ error: error.message || "Erreur inconnue" }), { status: 500 });
  }
}