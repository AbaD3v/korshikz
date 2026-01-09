// /chatbot-ai/prompts.ts
import type { ChatMessage } from "../chatbot/types/ChatbotTypes";
import type { Intent } from "./intents";

export const SYSTEM_PROMPT = `Ты — помощник по поиску соседей и аренде (Korshi Chat).
Отвечай вежливо и по делу, задавай уточняющие вопросы, если нужно.
- Если пользователь говорит о городе или районе — спроси уточняющие предпочтения (цена, число комнат, долгосрочно/краткосрочно).
- Если пользователь просит поиска соседа — уточни профиль (пол, возраст, питомцы, работа/учёба).
- Форматируй короткие списки и используй простые фразы.
Если требуется — предложи пользователю следующие шаги: посмотреть объявления, задать дополнительные фильтры, или оставить контакт.`;

export const ONBOARDING_PROMPT = `Привет! Я помогу найти жильё или соседей. Чтобы начать, скажи: ищу квартиру / ищу соседа и укажи город.`;

/**
 * Функция сборки промпта для LLM
 */
export function buildPrompt(userInput: string, context: ChatMessage[], intent: Intent | null): string {
  const history = context
    .slice(-3) // последние 3 сообщения
    .map(m => `${m.role}: ${m.text}`)
    .join("\n");

  return `
${SYSTEM_PROMPT}

История диалога:
${history}

Пользователь: ${userInput}
Намерение: ${intent?.category ?? "не определено"}

Ответь дружелюбно, учитывая контекст и инструкции.
  `;
}

export default {
  SYSTEM_PROMPT,
  ONBOARDING_PROMPT,
  buildPrompt,
};
