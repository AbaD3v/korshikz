import { ChatMessage } from "../types/ChatbotTypes";

export class ContextStore {
  private messages: ChatMessage[] = [];

  add(message: ChatMessage) {
    this.messages.push(message);
  }

  getAll() {
    return [...this.messages];
  }

  clear() {
    this.messages = [];
  }
}
