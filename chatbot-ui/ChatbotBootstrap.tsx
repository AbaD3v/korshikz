"use client";

import { useContext, useEffect } from "react";
import { ChatbotContext } from "./ChatbotProvider";
import { createKorshiBot } from "@/chatbot-ai/createKorshiBot";

export default function ChatbotBootstrap() {
  const ctx = useContext(ChatbotContext);

  useEffect(() => {
    const bot = createKorshiBot();

    // Auto-greeting: если нет сообщений от пользователя
    if (!ctx.messages.length) {
      // небольшая задержка для естественности
      setTimeout(() => {
        ctx.sendMessage("Здравствуйте! Мне нужна ваша помощь"); // пустой текст → бот обработает как старт
      }, 300);
    }
  }, [ctx]);

  return null;
}
