// /chatbot-ai/router.ts
import intents, { Intent } from "./intents";
import { keywordsScore } from "./nlp";
import { setState } from "./dialogState";
import { createClientLLMBot } from "./createClientLLMBot";
import type { BotResponse, StreamingProvider } from "../chatbot/types/ChatbotTypes";

// Инициализируем LLM здесь (она будет синглтоном внутри этого модуля)
const llm = createClientLLMBot();

export type RouteResult =
  | { type: "intent"; intent: Intent; confidence: number; }
  | { type: "fallback"; };

// Твоя оригинальная логика маршрутизации
export function route(input: string): RouteResult {
  const normalized = input.trim().toLowerCase();

  // 1. Regex
  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      if (pattern.test(normalized)) {
        setState(intent.category === "search" ? "search" : "free");
        return { type: "intent", intent, confidence: 1 };
      }
    }
  }

  // 2. Keyword scoring
  let bestIntent: Intent | null = null;
  let bestScore = 0;

  for (const intent of intents) {
    const score = keywordsScore(normalized, intent.synonyms ?? []);
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  if (bestIntent && bestScore >= 0.45) {
    setState(bestIntent.category === "search" ? "search" : "free");
    return { type: "intent", intent: bestIntent, confidence: bestScore };
  }

  setState("free");
  return { type: "fallback" };
}

// ТОТ САМЫЙ ЭКСПОРТ, КОТОРОГО НЕ ХВАТАЛО
export const smartStreamingRouter: StreamingProvider = {
  async* stream(text: string) {
    const result = route(text);

    // Если нашли интент и он статический — возвращаем случайную фразу из списка
    if (result.type === "intent" && result.intent.responseStrategy !== "dynamic") {
      const responses = result.intent.responses || [];
      yield responses[Math.floor(Math.random() * responses.length)] || "Секунду...";
      return;
    }

    // Если это fallback или динамический интент — используем LLM
    const llmStream = llm.stream(text);
    for await (const chunk of llmStream) {
      yield chunk;
    }
  },

  async send(text: string): Promise<BotResponse> {
    const result = route(text);

    if (result.type === "intent" && result.intent.responseStrategy !== "dynamic") {
      const responses = result.intent.responses || [];
      return {
        text: responses[Math.floor(Math.random() * responses.length)] || "",
        intent: result.intent.id,
        confidence: result.confidence,
        quickReplies: result.intent.quickReplies,
        links: result.intent.links,
      };
    }

    // Обращение к LLM
    const response = await llm.send(text);
    return {
      ...response,
      intent: result.type === "intent" ? result.intent.id : "llm_fallback",
      quickReplies: result.type === "intent" ? result.intent.quickReplies : [],
      links: result.type === "intent" ? result.intent.links : [],
    };
  }
};