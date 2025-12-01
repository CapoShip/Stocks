import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req) {
  if (!process.env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Clé Groq manquante" }),
      { status: 500 }
    );
  }

  let messages = [];
  let data = {};

  try {
    const body = await req.json();

    // On sécurise : messages DOIT être un tableau
    messages = Array.isArray(body?.messages) ? body.messages : [];
    // data doit être un objet
    data = body?.data && typeof body.data === 'object' ? body.data : {};
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Requête mal formée (JSON invalide ou corps vide)" }),
      { status: 400 }
    );
  }

  try {
    const contextStock = data.stockInfo
      ? `Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$. Variation: ${data.stockInfo.changePercent}%`
      : "Pas d'action spécifique fournie.";

    const systemInstruction = `
Tu es un expert en bourse et en analyse d'actions.
CONTEXTE MARCHÉ: ${contextStock}
Réponds toujours en français, de façon claire, structurée et pédagogique.
Si l'utilisateur ne parle pas de bourse, réponds normalement en français.
`.trim();

    // On convertit nous-mêmes l'historique → format attendu par ai-sdk
    const history = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({
        role: m.role,
        content: m.content,
      }));

    const finalMessages = [
      { role: 'system', content: systemInstruction },
      ...history,
    ];

    const response = await generateText({
      model: groq('llama2-70b-4096'),
      messages: finalMessages,
    });

    return NextResponse.json({
      text: response.text,
      id: response.id || 'ai-response',
      role: 'assistant',
    });

  } catch (error) {
    console.error("ERREUR CRITIQUE [API CHAT / GROQ]:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur inconnue de l'API" }),
      { status: 500 }
    );
  }
}
