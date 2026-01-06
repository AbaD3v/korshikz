// /chatbot-ai/createChatbotProvider.ts
import type { BotResponse, ResponseProvider } from "../chatbot/types/ChatbotTypes";
import { createKorshiBot as createRawKorshiBot } from "./createKorshiBot";

/**
 * Возвращает ResponseProvider, совместимый с типами проекта.
 * - Если raw провайдер имеет send — используем его.
 * - Если есть только stream — аккумулируем чанки и возвращаем BotResponse.
 * - Если raw провайдер также предоставляет stream — прокидываем его в итоговый объект.
 */
export function createChatbotProvider(): ResponseProvider {
  const raw = createRawKorshiBot() as any;

  const rawProvider = raw as Partial<{
    send: (prompt: string, opts?: any) => Promise<BotResponse>;
    stream: (prompt: string, opts?: any) => AsyncGenerator<string, void, void>;
  }>;

  const getResponse = async (prompt: string, opts?: any): Promise<BotResponse> => {
    // Если есть send — используем напрямую
    if (typeof rawProvider.send === "function") {
      return rawProvider.send(prompt, opts);
    }

    // Если есть stream — аккумулируем чанки в строку и возвращаем минимальный BotResponse
    if (typeof rawProvider.stream === "function") {
      let accumulated = "";
      try {
        for await (const chunk of rawProvider.stream(prompt, opts)) {
          accumulated += chunk;
        }
      } catch (e) {
        // пробрасываем ошибку дальше, caller обработает
        throw e;
      }
      return {
        text: accumulated,
        intent: undefined,
        confidence: 1,
      } as BotResponse;
    }

    throw new Error("Raw provider has neither send nor stream");
  };

  const provider: ResponseProvider = {
    getResponse,
    // Прокидываем stream, если raw провайдер его предоставляет
    stream: typeof rawProvider.stream === "function" ? rawProvider.stream.bind(rawProvider) : undefined,
  };

  return provider;
}
