import { ChatbotCore } from "./core/ChatbotCore";
import { MockProvider } from "./providers/MockProvider";
import type { ChatbotConfig, ChatMessage } from "./types/ChatbotTypes";

export function createChatbot(config: ChatbotConfig = {}) {
  const core = new ChatbotCore({
    provider: config.provider ?? new MockProvider(),
    contextStore: config.contextStore,
  });

  if (config.onMessage) core.onMessage(config.onMessage);

  return {
    sendMessage: (text: string) => core.sendMessage(text),
    onMessage: (cb: (msg: ChatMessage) => void) => core.onMessage(cb),
  };
}
