// /chatbot/providers/MockProvider.ts
import type { ResponseProvider, BotResponse, ChatMessage } from "../types/ChatbotTypes";

/**
 * Простой mock-провайдер для разработки.
 * Возвращает BotResponse с confidence и опциональными quickReplies.
 */
export class MockProvider implements ResponseProvider {
  async getResponse(prompt: string, _context?: ChatMessage[] | any): Promise<BotResponse> {
    const trimmed = prompt.trim();
    const confidence = trimmed.length < 10 ? 0.25 : 0.9;

    if (confidence < 0.5) {
      return {
        text: "Я пока не нашёл точного ответа. Могу переформулировать или показать похожие темы.",
        confidence,
        quickReplies: ["Переформулировать", "Показать похожие темы", "Связаться с поддержкой"],
      };
    }

    return {
      text: `Эхо: ${prompt}`,
      confidence,
    };
  }
}
