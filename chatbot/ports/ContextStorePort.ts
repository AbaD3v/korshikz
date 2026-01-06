// chatbot/ports/ContextStorePort.ts
import type { ChatMessage } from "../types/ChatbotTypes";

export interface ContextStorePort {
  /**
   * Добавляет новое сообщение в хранилище
   */
  add(message: ChatMessage): void;

  /**
   * Возвращает все сохранённые сообщения (историю диалога)
   */
  getAll(): ChatMessage[];
}
