import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req) {
  const { messages, data } = await req.json();

  // On récupère les infos de l'action que l'utilisateur regarde (envoyées depuis le front)
  const contextStock = data?.stockInfo 
    ? `L'utilisateur regarde l'action ${data.stockInfo.symbol} (${data.stockInfo.name}). 
       Prix: ${data.stockInfo.price} USD. 
       Variation: ${data.stockInfo.changePercent}%.
       Secteur: ${data.stockInfo.sector}.`
    : "L'utilisateur est sur le tableau de bord général.";

  const result = await streamText({
    model: openai('gpt-4-turbo'), // Ou gpt-3.5-turbo pour moins cher
    system: `Tu es un analyste financier expert nommé 'Gemini-Lite'. 
             Tu es concis, professionnel mais accessible.
             Utilise des emojis pour rendre la lecture agréable.
             CONTEXTE ACTUEL : ${contextStock}
             Réponds aux questions de l'utilisateur en te basant sur ce contexte.`,
    messages,
  });

  return result.toDataStreamResponse();
}