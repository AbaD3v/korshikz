import type { StreamingProvider } from "@/chatbot-ui/ChatbotProvider";

type DialogState =
  | "idle"
  | "choose_goal"
  | "search_room"
  | "search_roommate"
  | "free_chat";

const SYSTEM_CONTEXT = `
Ты — ассистент сервиса Korshi.
Помогаешь с:
- поиском жилья
- поиском соседей
- вопросами о сервисе

Правила:
- отвечай кратко и по делу
- если запрос неясен — задай уточняющий вопрос
- не выдумывай факты
- язык: русский
`;

export function createKorshiBot(): StreamingProvider {
  let state: DialogState = "idle";

  return {
    async send(userText: string) {
      const text = userText.toLowerCase();

      /* ===== 1. Первое сообщение ===== */
      if (state === "idle") {
        state = "choose_goal";
        return (
          "Привет! 👋\n" +
          "Я помогу:\n" +
          "• найти жильё\n" +
          "• найти соседа\n\n" +
          "Что тебе нужно?"
        );
      }

      /* ===== 2. Выбор сценария ===== */
      if (state === "choose_goal") {
        if (text.includes("сосед")) {
          state = "search_roommate";
          return "Отлично 👍 В каком городе ты ищешь соседа?";
        }

        if (text.includes("квартир") || text.includes("жиль")) {
          state = "search_room";
          return "Понял 👍 В каком городе ты ищешь жильё?";
        }

        return "Я могу помочь с поиском жилья или соседа. Что именно ты ищешь?";
      }

      /* ===== 3. Контекстные сценарии ===== */
      if (state === "search_room" || state === "search_roommate") {
        state = "free_chat";
        return (
          "Хорошо. Я зафиксировал город.\n" +
          "Скажи, пожалуйста:\n" +
          "• бюджет\n" +
          "• примерный срок\n" +
          "• есть ли особые требования"
        );
      }

      /* ===== 4. Fallback → API ===== */
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: userText,
          context: SYSTEM_CONTEXT,
          model: "korshi-lite",
        }),
      });

      if (!res.ok) {
        return "Произошла ошибка. Попробуй переформулировать вопрос.";
      }

      const data = await res.json();
      return data.text ?? "Я не смог сформировать ответ.";
    },
  };
}
