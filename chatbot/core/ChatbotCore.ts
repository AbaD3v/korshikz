// /chatbot/core/ChatbotCore.ts
import type {
  ChatMessage,
  ResponseProvider,
  BotResponse,
  ChatbotConfig,
} from "../types/ChatbotTypes";

export class ChatbotCore {
  private provider: ResponseProvider;
  private messages: ChatMessage[] = [];
  private onMessageCb?: (msg: ChatMessage) => void;
  private enableStreaming: boolean;

  constructor(config: ChatbotConfig) {
    this.provider = config.provider;
    this.onMessageCb = config.onMessage;
    this.enableStreaming = config.enableStreaming ?? true;

    if (config.initialMessages) {
      this.messages = [...config.initialMessages];
    }
  }

  onMessage(cb: (msg: ChatMessage) => void) {
    this.onMessageCb = cb;
  }

  async sendMessage(text: string) {
    // 1. Создаем сообщение пользователя
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: Date.now(),
    };

    // 2. Сохраняем ТЕКУЩУЮ историю для передачи в LLM как контекст
    const historyContext = [...this.messages];

    // 3. Добавляем сообщение пользователя в локальный стейт
    this.pushMessage(userMsg);

    if (this.enableStreaming && this.provider.stream) {
      const partialId = crypto.randomUUID();
      let accumulated = "";

      const partialMsg: ChatMessage = {
        id: partialId,
        role: "ai",
        text: "",
        timestamp: Date.now(),
        partial: true,
      };
      this.pushMessage(partialMsg);

      try {
        // Передаем текст И историю сообщений
        const stream = this.provider.stream(text, historyContext);
        for await (const chunk of stream) {
          accumulated += chunk;
          this.updateMessage(partialId, { text: accumulated, partial: true });
        }

        // Финализируем
        this.updateMessage(partialId, {
          text: accumulated.trim(),
          partial: false,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("ChatbotCore Stream Error:", err);
        this.updateMessage(partialId, {
          text: "Произошла ошибка при генерации ответа.",
          partial: false,
        });
      }
    } else {
      try {
        // Обычный запрос (не стриминг) тоже с контекстом
        const resp: BotResponse = await this.provider.getResponse(text, historyContext);
        this.pushMessage({
          id: crypto.randomUUID(),
          role: "ai",
          text: resp.text,
          timestamp: Date.now(),
          intent: resp.intent,
          confidence: resp.confidence,
          links: resp.links,
          quickReplies: resp.quickReplies,
          partial: false,
        });
      } catch {
        this.pushMessage({
          id: crypto.randomUUID(),
          role: "ai",
          text: "Ошибка связи с ботом.",
          timestamp: Date.now(),
        });
      }
    }
  }

  private pushMessage(msg: ChatMessage) {
    this.messages.push(msg);
    this.onMessageCb?.(msg);
  }

  private updateMessage(id: string, patch: Partial<ChatMessage>) {
    this.messages = this.messages.map((m) =>
      m.id === id ? { ...m, ...patch } : m
    );
    const updated = this.messages.find((m) => m.id === id);
    if (updated) this.onMessageCb?.(updated);
  }

  getMessages() {
    return this.messages;
  }
}