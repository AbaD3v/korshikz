// /chatbot-ui/useChatbotStreaming.ts
"use client";

import { useContext, useMemo, useCallback } from "react";
import { ChatbotContext, ChatbotContextType, Message } from "./ChatbotProvider";

export default function useChatbotStreaming() {
  const ctx = useContext(ChatbotContext) as ChatbotContextType;

  // находим последнее AI-сообщение, которое еще стримится
  const partial = useMemo(() => {
    if (!ctx?.messages?.length) return "";
    for (let i = ctx.messages.length - 1; i >= 0; i--) {
      const m = ctx.messages[i];
      if (m.role === "ai" && m.partial) return m.text;
    }
    return "";
  }, [ctx?.messages]);

  const clear = useCallback(() => {
    // partial очищается автоматически при новом сообщении
    // метод оставлен для API-совместимости
  }, []);

return {
  partial,
  isStreaming: ctx?.isStreaming ?? false,
  sendMessage: ctx?.sendMessage,
  // убираем subscribe
};
}
