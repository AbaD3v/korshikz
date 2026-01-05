import type { ChatMessage, ResponseProvider, ContextStorePort } from "../types/ChatbotTypes";

interface CoreOptions {
  provider: ResponseProvider;
  contextStore?: ContextStorePort;
}

export class ChatbotCore {
  private messages: ChatMessage[] = [];
  private listeners: ((msg: ChatMessage) => void)[] = [];

  constructor(private opts: CoreOptions) {}

  sendMessage(text: string) {
    const msg: ChatMessage = { role: "user", text, timestamp: Date.now() };
    this.opts.contextStore?.add(msg);
    this.messages.push(msg);
    this.listeners.forEach(l => l(msg));

    // Асинхронный AI ответ
    this.opts.provider.getResponse(text, this.messages).then(resp => {
      // ✅ Проверка на дубликат
      if (!this.messages.some(m => m.text === resp && m.role === "bot")) {
        const botMsg: ChatMessage = { role: "bot", text: resp, timestamp: Date.now() };
        this.opts.contextStore?.add(botMsg);
        this.messages.push(botMsg);
        this.listeners.forEach(l => l(botMsg));
      }
    });
  }

  onMessage(cb: (msg: ChatMessage) => void) {
    this.listeners.push(cb);
  }

  getMessages() {
    return this.messages;
  }
}
