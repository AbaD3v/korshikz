import type { ChatMessage } from "../types/ChatbotTypes";

export interface ContextStorePort {
  add(message: ChatMessage): void;
  getAll(): ChatMessage[];
}
