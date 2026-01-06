// /chatbot/index.ts
import { ChatbotCore } from "./core/ChatbotCore";
import { MockProvider } from "./providers/MockProvider";
import type { ChatbotConfig, ChatMessage } from "./types/ChatbotTypes";

export function createChatbot(config: ChatbotConfig = {}) {
  const core = new ChatbotCore({
    provider: config.provider ?? new MockProvider(),
    contextStore: config.contextStore,
  });

  // Защищённая регистрация колбэка: проверяем, что onMessage — функция
  if (typeof config.onMessage === "function") {
    core.onMessage(config.onMessage as (msg: ChatMessage) => void);
  }

  return {
    sendMessage: (text: string) => core.sendMessage(text),
    onMessage: (cb: (msg: ChatMessage) => void) => core.onMessage(cb),
  };
}
