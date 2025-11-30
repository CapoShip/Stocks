import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req) {
  try {
    const { messages, data } = await req.json();

    // 1. On prépare le contexte
    const contextStock = data?.stockInfo 
      ? `CONTEXTE ACTUEL : Action ${data.stockInfo.symbol} à ${data.stockInfo.price}$. Variation: ${data.stockInfo.changePercent}%.`
      : "Pas d'action spécifique sélectionnée.";

    // 2. ASTUCE : On crée un "Faux" premier message système
    // Cela contourne le bug de Google qui rejette parfois le paramètre 'system'
    const systemMessage = {
      role: 'user',
      content: `INSTRUCTIONS : Tu es un expert en bourse. ${contextStock}. 
                Réponds aux questions de l'utilisateur de manière concise et en français. 
                Utilise des emojis.`
    };

    // 3. On appelle Google Gemini (Modèle Flash)
    const result = await streamText({
      model: google('gemini-1.5-flash'),
      // On colle notre faux message système au début de la conversation
      messages: [systemMessage, ...messages],
    });

    return result.toDataStreamResponse();

  } catch (error) {
    // Si ça plante, on affiche l'erreur exacte dans les logs Vercel
    console.error("GROSSE ERREUR SERVEUR:", error);
    // Et on renvoie un message lisible au site
    return new Response(JSON.stringify({ error: error.message || "Erreur inconnue" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}