// /chatbot/stores/LocalStorageContextStore.ts
import type { ChatMessage, ContextStorePort } from "../types/ChatbotTypes";

const STORAGE_KEY = "korshi_chat_context_v1";

export class LocalStorageContextStore implements ContextStorePort {
  private storageKey: string;

  constructor(storageKey: string = STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  async add(message: ChatMessage): Promise<void> {
    const all = await this.getAll();
    // сохраняем сообщения как словарь по id
    all[message.id] = message as unknown as Record<string, unknown>;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(all));
    } catch {
      // silent fail for environments without localStorage
    }
  }

  async getAll(): Promise<Record<string, Record<string, unknown>>> {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  async get(key: string): Promise<Record<string, unknown>> {
    const all = await this.getAll();
    return all[key] ?? {};
  }

  async set(key: string, value: Record<string, unknown>): Promise<void> {
    const all = await this.getAll();
    all[key] = value;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(all));
    } catch {
      // ignore
    }
  }

  async delete(key: string): Promise<void> {
    const all = await this.getAll();
    delete all[key];
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(all));
    } catch {
      // ignore
    }
  }
}
