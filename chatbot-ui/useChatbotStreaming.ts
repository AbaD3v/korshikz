// /chatbot-ui/useChatbotStreaming.ts
"use client";

import { useMemo, useCallback } from "react";
import { useChatbot } from "./ChatbotProvider";

export default function useChatbotStreaming() {
  // Используем хук, который мы уже экспортировали из провайдера
  const { messages, isStreaming, sendMessage } = useChatbot();

  // Находим последнее AI-сообщение, которое еще стримится
  const partial = useMemo(() => {
    if (!messages || messages.length === 0) return "";
    
    // Идем с конца массива сообщений
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "ai" && m.partial) return m.text;
    }
    return "";
  }, [messages]);

  const clear = useCallback(() => {
    // Метод оставлен для совместимости
  }, []);

  return {
    partial,
    isStreaming: isStreaming ?? false,
    sendMessage,
  };
}