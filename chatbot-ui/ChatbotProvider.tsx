"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { smartStreamingRouter, ChatMode } from "../chatbot-ai/router";
import { v4 as uuidv4 } from "uuid";

// Интерфейс сообщения
export interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: string; 
  partial?: boolean;
}

export interface ChatbotContextType {
  messages: Message[];
  isStreaming: boolean;
  sendMessage: (text: string, mode?: ChatMode) => Promise<void>;
  clearChat: () => void;
}

interface ChatbotProviderProps {
  children: React.ReactNode;
  storageKey?: string; 
  streamingProvider?: any;
}

export const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export function ChatbotProvider({ 
  children, 
  storageKey = "korshi_chat_history", 
  streamingProvider 
}: ChatbotProviderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. ЗАГРУЗКА ИЗ LOCALSTORAGE
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    setIsLoaded(true);
  }, [storageKey]);

  // 2. СОХРАНЕНИЕ В LOCALSTORAGE
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, isLoaded, storageKey]);

  // Функция очистки чата
  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // ОСНОВНАЯ ФУНКЦИЯ ОТПРАВКИ
  const sendMessage = useCallback(async (text: string, mode: ChatMode = "smart") => {
    if (!text.trim()) return;

    // Генерируем читаемое время (например, 18:30)
    const timeString = new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // ПОДГОТОВКА ИСТОРИИ ДЛЯ РОУТЕРА И LLM
    // Важно: передаем 'text', чтобы createGroqbot его узнал
    const historyForLlm = messages
      .filter(m => m.text && m.text.trim() !== "")
      .slice(-10)
      .map(m => ({
        role: m.role === "ai" ? "assistant" : "user",
        text: m.text 
      }));

    const userMsgId = uuidv4();
    const aiMsgId = uuidv4();

    // Добавляем сообщения в стейт
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text, timestamp: timeString },
      { id: aiMsgId, role: "ai", text: "", partial: true, timestamp: timeString }
    ]);

    setIsStreaming(true);

    try {
      let fullContent = "";
      const activeProvider = streamingProvider || smartStreamingRouter;
      
      const stream = activeProvider.stream(text, historyForLlm, mode);

      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId ? { ...msg, text: fullContent } : msg
          )
        );
      }

      // Завершаем стрим (убираем пульсацию)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId ? { ...msg, partial: false } : msg
        )
      );
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId 
            ? { ...msg, text: "Ошибка связи. Попробуйте еще раз.", partial: false } 
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [messages, streamingProvider]);

  return (
    <ChatbotContext.Provider value={{ messages, isStreaming, sendMessage, clearChat }}>
      {children}
    </ChatbotContext.Provider>
  );
}

export const useChatbot = () => {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error("useChatbot must be used within a ChatbotProvider");
  }
  return context;
};