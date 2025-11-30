import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req) {
  const { messages, data } = await req.json();

  const contextStock = data?.stockInfo 
    ? `CONTEXTE ACTUEL : 
       - Action : ${data.stockInfo.symbol} (${data.stockInfo.name})
       - Prix : $${data.stockInfo.price}
       - Variation du jour : ${data.stockInfo.changePercent}%
       - Secteur : ${data.stockInfo.sector}
       L'utilisateur regarde cette action en ce moment.`
    : "L'utilisateur est sur le tableau de bord général.";

  const result = await streamText({
    // On utilise le modèle Flash, qui est rapide et gratuit
    model: google('gemini-1.5-flash'), 
    system: `Tu es CapoTrade, un expert boursier.
             Ton but est d'aider l'utilisateur à comprendre les marchés.
             Sois concis, utilise des emojis 📈.
             Utilise ce contexte pour répondre : ${contextStock}`,
    messages,
  });

  return result.toDataStreamResponse();
}