import type { ResponseProvider, ChatMessage } from "../types/ChatbotTypes";

export class StreamingBus {
  private listeners: ((chunk: string) => void)[] = [];

  subscribe(cb: (chunk: string) => void) {
    this.listeners.push(cb);
    return () => (this.listeners = this.listeners.filter(l => l !== cb));
  }

  emit(chunk: string) {
    this.listeners.forEach(l => l(chunk));
  }
}

export class StreamingProvider implements ResponseProvider {
  public stream = new StreamingBus();

  constructor(private base: ResponseProvider, private delay = 20) {}

  async getResponse(input: string, context: ChatMessage[]): Promise<string> {
    const full = await this.base.getResponse(input, context);

    // Отправляем partial по буквам
    let buffer = "";
    for (const char of full) {
      buffer += char;
      this.stream.emit(buffer); // ✅ только для частичных обновлений
      await new Promise(r => setTimeout(r, this.delay));
    }

    // Возвращаем full для ChatbotCore, но не пушим в поток повторно
    return full;
  }
}
