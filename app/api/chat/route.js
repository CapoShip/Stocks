import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req) {
  console.log("1. Début de la requête Chat");

  // Vérification de sécurité : Est-ce que Vercel voit la clé ?
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error("❌ ERREUR FATALE : La clé API est introuvable dans les variables d'environnement !");
    return new Response(JSON.stringify({ error: "Clé API manquante sur le serveur" }), { status: 500 });
  }

  try {
    const { messages } = await req.json();
    console.log("2. Message reçu du client");

    const result = await streamText({
      // ESSAI AVEC LE PRÉFIXE COMPLET (Souvent la solution)
      model: google('models/gemini-1.5-flash'),
      messages,
    });

    console.log("3. Connexion Google réussie, début du stream");
    return result.toDataStreamResponse();

  } catch (error) {
    // C'est ICI que la vraie erreur va s'afficher dans les logs Vercel
    console.error("🛑 ERREUR GOOGLE PRÉCISE :", error);
    
    return new Response(JSON.stringify({ 
      error: "Erreur serveur : " + (error.message || error.toString()) 
    }), { status: 500 });
  }
}