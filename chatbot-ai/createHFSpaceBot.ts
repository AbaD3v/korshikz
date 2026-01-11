// код: chatbot-ai/createHFSpaceBot.ts
import type { StreamingProvider, BotResponse } from "../chatbot/types/ChatbotTypes";

const LOCAL_API = "/api/chat";

export function createHFSpaceBot(): StreamingProvider {
  async function send(prompt: string): Promise<BotResponse> {
    const res = await fetch(LOCAL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const json = await res.json();
    const reply = json?.data?.[0] ?? "Ошибка: Space не ответил.";

    return {
      text: reply,
      intent: "hf_space",
      confidence: 0.9,
      links: [],
      quickReplies: [],
    };
  }

  async function* stream(prompt: string) {
    const r = await send(prompt);
    yield r.text;
  }

  return { send, stream };
}
