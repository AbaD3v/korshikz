import type { ContextStorePort, ChatMessage } from "../types/ChatbotTypes";

export class LocalStorageContextStore implements ContextStorePort {
  private key = "chatbot_messages";

  add(message: ChatMessage) {
    const arr = this.getAll();
    arr.push(message);
    localStorage.setItem(this.key, JSON.stringify(arr));
  }

  getAll(): ChatMessage[] {
    const str = localStorage.getItem(this.key);
    return str ? JSON.parse(str) : [];
  }
}
