// /chatbot-ai/router.ts
import intents, { Intent } from "./intents";
import { keywordsScore } from "./nlp";
import { setState } from "./dialogState";
import { createGroqbot } from "./createGroqbot";
import type { BotResponse, StreamingProvider } from "../chatbot/types/ChatbotTypes";

const llm = createGroqbot();

export type RouteResult =
  | { type: "intent"; intent: Intent; confidence: number; }
  | { type: "fallback"; };

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

export const smartStreamingRouter: StreamingProvider = {
  async* stream(text: string, history: any[] = []) {
    const result = route(text);

    // Условие для игнорирования статики: если ввод короткий (1-2 слова) 
    // и это явно продолжение беседы (есть история).
    const isShortInput = text.trim().split(/\s+/).length <= 2;
    const hasHistory = history && history.length > 0;

    // Если нашли интент, он статический И это НЕ короткая дописка в существующий диалог
    if (
      result.type === "intent" && 
      result.intent.responseStrategy !== "dynamic" &&
      !(hasHistory && isShortInput) 
    ) {
      const responses = result.intent.responses || [];
      yield responses[Math.floor(Math.random() * responses.length)] || "Секунду...";
      return;
    }

    // Во всех остальных случаях используем LLM (Groq)
    const llmStream = llm.stream(text, history);
    for await (const chunk of llmStream) {
      yield chunk;
    }
  },

  async send(text: string, history: any[] = []): Promise<BotResponse> {
    const result = route(text);
    const isShortInput = text.trim().split(/\s+/).length <= 2;
    const hasHistory = history && history.length > 0;

    // Проверяем, нужно ли отдавать статический ответ
    const shouldReturnStatic = 
      result.type === "intent" && 
      result.intent.responseStrategy !== "dynamic" &&
      !(hasHistory && isShortInput);

    if (shouldReturnStatic && result.type === "intent") {
      const responses = result.intent.responses || [];
      return {
        text: responses[Math.floor(Math.random() * responses.length)] || "",
        intent: result.intent.id,
        confidence: result.confidence,
        quickReplies: result.intent.quickReplies,
        links: result.intent.links,
      };
    }

    // Если мы здесь — значит работает LLM
    const response = await llm.send(text, history);

    // СКЛЕЙКА: Если LLM ответила, но мы при этом распознали интент (например "Астана")
    // мы берем текст у LLM, но добавляем кнопки и ссылки из интента
    if (result.type === "intent") {
      return {
        ...response,
        intent: result.intent.id,
        quickReplies: result.intent.quickReplies || [],
        links: result.intent.links || [],
      };
    }

    // Полный fallback
    return {
      ...response,
      intent: "llm_fallback",
    };
  }
};