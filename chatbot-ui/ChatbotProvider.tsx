"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

import type {
  ChatMessage,
  ResponseProvider,
  StreamingProvider,
  BotResponse,
} from "../chatbot/types/ChatbotTypes";

import { ChatbotCore } from "../chatbot/core/ChatbotCore";
import { ONBOARDING_PROMPT } from "../chatbot-ai/prompts";
import { setState } from "../chatbot-ai/dialogState";

// -----------------------------
// Types
export type Message = ChatMessage;

export type ChatbotContextType = {
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
  isStreaming: boolean;
};

// 1. Создаем контекст
export const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

// 2. Экспортируем хук для безопасного доступа
export const useChatbot = (): ChatbotContextType => {
  const ctx = useContext(ChatbotContext);
  if (!ctx) {
    // Эта ошибка поможет тебе понять, если компонент оказался вне провайдера
    throw new Error("useChatbot must be used within ChatbotProvider");
  }
  return ctx;
};

// Адаптер
function wrapStreamingProvider(sp: StreamingProvider): ResponseProvider {
  return {
    async getResponse(prompt: string): Promise<BotResponse> {
      if (sp.send) return await sp.send(prompt);
      return { text: "", intent: "empty", confidence: 0 };
    },
    stream: sp.stream,
  };
}

interface ChatbotProviderProps {
  children: React.ReactNode;
  storageKey?: string;
  streamingProvider: StreamingProvider; // Теперь обязательно передаем из _app.tsx
}

export const ChatbotProvider: React.FC<ChatbotProviderProps> = ({ 
  children, 
  storageKey, 
  streamingProvider 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const coreRef = useRef<ChatbotCore | null>(null);

  // Инициализация Core
  useEffect(() => {
    if (coreRef.current) return;

    const provider = wrapStreamingProvider(streamingProvider);
    coreRef.current = new ChatbotCore({ provider });

    coreRef.current.onMessage((msg) => {
      setMessages((prev) => {
        const exists = prev.find((m) => m.id === msg.id);
        return exists
          ? prev.map((m) => (m.id === msg.id ? msg : m))
          : [...prev, msg];
      });
    });
  }, [streamingProvider]);

  // История (Load)
  useEffect(() => {
    if (!storageKey) return;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMessages(parsed);
      } catch (e) { console.error(e); }
    }
  }, [storageKey]);

  // История (Save)
  useEffect(() => {
    if (storageKey && messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  // Onboarding
  useEffect(() => {
    if (messages.length > 0) return;
    const onboardingMsg: Message = {
      id: crypto.randomUUID(),
      role: "ai",
      text: ONBOARDING_PROMPT,
      timestamp: Date.now(),
      intent: "onboarding",
    };
    setMessages([onboardingMsg]);
    setState("onboarding");
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!coreRef.current || !text.trim() || isStreaming) return;
    try {
      setIsStreaming(true);
      await coreRef.current.sendMessage(text);
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming]);

  return (
    <ChatbotContext.Provider value={{ messages, sendMessage, isStreaming }}>
      {children}
    </ChatbotContext.Provider>
  );
};