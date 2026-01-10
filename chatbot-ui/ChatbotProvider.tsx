// /chatbot-ui/ChatbotProvider.tsx
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

export type Message = ChatMessage;

export type ChatbotContextType = {
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
  isStreaming: boolean;
};

export const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export const useChatbot = (): ChatbotContextType => {
  const ctx = useContext(ChatbotContext);
  if (!ctx) throw new Error("useChatbot must be used within ChatbotProvider");
  return ctx;
};

// Исправленный адаптер: теперь прокидывает opts (историю)
function wrapStreamingProvider(sp: StreamingProvider): ResponseProvider {
  return {
    async getResponse(prompt: string, opts?: any): Promise<BotResponse> {
      if (sp.send) return await sp.send(prompt, opts);
      return { text: "", intent: "empty", confidence: 0 };
    },
    // Прокидываем stream как есть, он уже поддерживает (prompt, opts)
    stream: sp.stream,
  };
}

interface ChatbotProviderProps {
  children: React.ReactNode;
  storageKey?: string;
  streamingProvider: StreamingProvider;
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
    coreRef.current = new ChatbotCore({ 
      provider,
      initialMessages: messages.length > 0 ? messages : undefined 
    });

    coreRef.current.onMessage((msg) => {
      setMessages((prev) => {
        const exists = prev.find((m) => m.id === msg.id);
        return exists
          ? prev.map((m) => (m.id === msg.id ? msg : m))
          : [...prev, msg];
      });
    });
  }, [streamingProvider]);

  // Sync LocalStorage
  useEffect(() => {
    if (storageKey && messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  // Загрузка истории при старте
  useEffect(() => {
    if (!storageKey) return;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && messages.length === 0) {
          setMessages(parsed);
        }
      } catch (e) { console.error(e); }
    }
  }, []);

  // Onboarding (только если чат пустой)
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
  }, [messages.length]);

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