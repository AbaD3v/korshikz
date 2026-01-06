// /chatbot-ai/router.ts
import type { BotResponse } from "../chatbot/types/ChatbotTypes";
import intents, { Intent } from "./intents";
import { makeFallback } from "./responseTemplates";
import { keywordsScore, pickResponse } from "./nlp";
import { setState } from "./dialogState";

export function route(input: string): BotResponse {
  const normalized = input.trim().toLowerCase();
  console.log("🔎 ROUTER: input =", input);
  console.log("🔎 ROUTER: normalized =", normalized);

  // 1. Regex‑матчинг по паттернам
  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      const match = pattern.test(normalized);
      console.log(
        `➡️ Testing intent=${intent.id}, pattern=${pattern}, result=${match}`
      );
      if (match) {
        console.log(`✅ Matched intent: ${intent.id}`);
        setState(intent.category === "search" ? "search" : "free");
        return {
          text: pickResponse(intent.responses),
          intent: intent.id,
          confidence: 1,
          links: intent.links,
          quickReplies: intent.quickReplies,
        };
      }
    }
  }

  // 2. NLP‑скоринг по synonyms
  let bestIntent: Intent | null = null;
  let bestScore = 0;

  for (const intent of intents) {
    const score = keywordsScore(normalized, intent.synonyms ?? []);
    console.log(`🧮 Scoring intent=${intent.id}, score=${score}`);
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  if (bestIntent && bestScore >= 0.45) {
    console.log(`✅ Best intent by synonyms: ${bestIntent.id}, score=${bestScore}`);
    setState(bestIntent.category === "search" ? "search" : "free");
    return {
      text: pickResponse(bestIntent.responses),
      intent: bestIntent.id,
      confidence: bestScore,
      links: bestIntent.links,
      quickReplies: bestIntent.quickReplies,
    };
  }

  // 3. Fallback
  console.log("⚠️ No intent matched, returning fallback");
  setState("free");
  return makeFallback();
}
