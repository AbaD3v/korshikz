// /chatbot-ai/createChatbotProvider.ts
import type { StreamingProvider } from "../chatbot-ui/ChatbotProvider";
import { SYSTEM_PROMPT, ONBOARDING_PROMPT } from "./prompts";
import { getState, setState } from "./dialogState";

export function createChatbotProvider(): StreamingProvider {
  return {
    async *stream(userText: string) {
      // 1. простая state machine using dialogState module
      const dialogState = getState();
      if (dialogState === "idle") {
        setState("onboarding");
        yield ONBOARDING_PROMPT + "\n";
        return;
      }

      if (dialogState === "onboarding") {
        if (/сосед/i.test(userText)) {
          setState("search");
          yield "Отлично. В каком городе ты ищешь соседа?";
          return;
        }
        if (/квартир|жиль/i.test(userText)) {
          setState("search");
          yield "Понял. В каком городе ты ищешь жильё?";
          return;
        }
        yield "Я могу помочь с поиском жилья или соседа. Что именно?";
        return;
      }

      // 2. fallback → AI (stream response from /api/ai)
      setState("free");
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userText },
          ],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        yield `Ошибка на сервере: ${res.status} ${text}`;
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield decoder.decode(value);
      }
    },
  };
}
