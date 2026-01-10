// /chatbot-ai/router.ts
import intents, { Intent } from "./intents";
import { keywordsScore } from "./nlp";
import { setState } from "./dialogState";
import { createGroqbot } from "./createGroqbot";
import type { BotResponse, StreamingProvider } from "../chatbot/types/ChatbotTypes";

// Добавим тип для режимов
export type ChatMode = "smart" | "pro";

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
  /**
   * Стриминг ответа с учетом выбранного режима
   */
  async* stream(text: string, history: any[] = [], mode: ChatMode = "smart") {
    const result = route(text);

    // Если режим PRO — игнорируем статические ответы и сразу идем в LLM
    if (mode === "pro") {
      const llmStream = llm.stream(text, history);
      for await (const chunk of llmStream) {
        yield chunk;
      }
      return;
    }

    // ЛОГИКА SMART (ГИБРИД)
    const isShortInput = text.trim().split(/\s+/).length <= 2;
    const hasHistory = history && history.length > 0;

    // Если нашли статику и это не короткое уточнение в диалоге
    if (
      result.type === "intent" && 
      result.intent.responseStrategy !== "dynamic" &&
      !(hasHistory && isShortInput) 
    ) {
      const responses = result.intent.responses || [];
      yield responses[Math.floor(Math.random() * responses.length)] || "Секунду...";
      return;
    }

    // Иначе LLM
    const llmStream = llm.stream(text, history);
    for await (const chunk of llmStream) {
      yield chunk;
    }
  },

  /**
   * Получение полного ответа (для не-стриминговых компонентов)
   */
  async send(text: string, history: any[] = [], mode: ChatMode = "smart"): Promise<BotResponse> {
    const result = route(text);

    // В режиме PRO мы НЕ возвращаем статический текст, только LLM
    const isPro = mode === "pro";
    const isShortInput = text.trim().split(/\s+/).length <= 2;
    const hasHistory = history && history.length > 0;

    const shouldReturnStatic = 
      !isPro &&
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

    // Вызываем LLM (Groq)
    const response = await llm.send(text, history);

    // "СКЛЕЙКА": Даже в PRO режиме, если мы распознали город или услугу,
    // мы берем текст у LLM, но прикрепляем полезные кнопки/ссылки из интента.
    if (result.type === "intent") {
      return {
        ...response,
        intent: result.intent.id,
        quickReplies: result.intent.quickReplies || [],
        links: result.intent.links || [],
      };
    }

    return {
      ...response,
      intent: "llm_fallback",
    };
  }
};