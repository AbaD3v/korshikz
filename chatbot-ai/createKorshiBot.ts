// /chatbot-ai/createKorshiBot.ts
import type { StreamingProvider } from "../chatbot-ui/ChatbotProvider";
import type { BotResponse } from "../chatbot/types/ChatbotTypes";
import { route } from "./router";
import { logUnknown, logRouteTelemetry } from "./telemetry";

function detectLangByText(text: string): "ru" | "kz" {
  const kzChars = (text.match(/[қғңүұөәі]/gi) || []).length;
  const ruChars = (text.match(/[ёыэъщ]/gi) || []).length;
  if (kzChars === 0 && ruChars === 0) {
    return /[А-Яа-яЁё]/.test(text) ? "ru" : "kz";
  }
  return kzChars > ruChars ? "kz" : "ru";
}

export function createKorshiBot(): StreamingProvider {
  return {
    async send(prompt: string) {
      const trimmed = (prompt || "").trim();
      if (!trimmed) {
        return {
          text: "Напишите, пожалуйста, ваш вопрос — я постараюсь помочь.",
          intent: "empty",
          confidence: 1,
          links: [],
          quickReplies: [],
        } as BotResponse;
      }

      const lang = detectLangByText(trimmed);

      let resp: BotResponse | null = null;
      try {
        // route принимает только строку
        resp = route(trimmed);
        logRouteTelemetry?.({
          prompt: trimmed,
          intent: resp.intent,
          confidence: resp.confidence,
        });
      } catch (err) {
        console.warn("route() error:", err);
        logUnknown(trimmed);
        resp = null;
      }

      if (resp) return resp;

      // общий fallback
      logUnknown(trimmed);
      return {
        text:
          lang === "ru"
            ? "Извини, я пока не знаю ответа на этот вопрос. Попробуй спросить про 'Объявления', 'Создать' или 'Чаты'."
            : "Кешіріңіз, мен бұл сұраққа жауап бере алмаймын. 'Хабарландырулар', 'Жасау' немесе 'Чаттар' туралы сұраңыз.",
        intent: "fallback",
        confidence: 0.2,
        links: [
          { label: lang === "ru" ? "Поиск" : "Іздеу", href: "/listings" },
          { label: lang === "ru" ? "Поддержка" : "Қолдау", href: "/support" },
        ],
        quickReplies: lang === "ru" ? ["Поиск", "Поддержка"] : ["Іздеу", "Қолдау"],
      };
    },

    async *stream(prompt: string) {
      const resp = await this.send(prompt);
      const text = resp.text ?? "";
      const chunkSize = 40;
      for (let i = 0; i < text.length; i += chunkSize) {
        yield text.slice(i, i + chunkSize);
        await new Promise((r) => setTimeout(r, 20));
      }
    },
  };
}
