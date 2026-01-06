// /chatbot-ui/ChatbotProvider.tsx
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import type { BotResponse } from "../chatbot/types/ChatbotTypes";
import { createKorshiBot } from "../chatbot-ai/createKorshiBot";
import { ONBOARDING_PROMPT } from "../chatbot-ai/prompts";
import { getState, setState } from "../chatbot-ai/dialogState";

/** Тип провайдера стриминга, совместимый с BotResponse */
export type StreamingProvider = {
  send?: (prompt: string, opts?: any) => Promise<BotResponse>;
  stream?: (prompt: string, opts?: any) => AsyncGenerator<string, void, void>;
};

export type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
  intent?: string;
  confidence?: number;
  links?: { label: string; href: string }[];
  quickReplies?: string[];
  partial?: boolean;
};

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

export type ChatbotProviderProps = {
  children: React.ReactNode;
  storageKey?: string;
  streamingProvider?: StreamingProvider;
};

function makeSafeProvider(raw: Partial<StreamingProvider>): Required<StreamingProvider> {
  const safeSend =
    raw.send ??
    (async (prompt: string, opts?: any) => {
      if (!raw.stream) throw new Error("Provider has neither send nor stream");
      let accumulated = "";
      for await (const chunk of raw.stream(prompt, opts)) {
        accumulated += chunk;
      }
      return {
        text: accumulated,
        confidence: 1,
      } as BotResponse;
    });

  const streamFn = raw.stream ? raw.stream.bind(raw) : undefined;

  return {
    send: safeSend,
    stream: streamFn ?? undefined,
  } as Required<StreamingProvider>;
}

export const ChatbotProvider: React.FC<ChatbotProviderProps> = ({ children, storageKey, streamingProvider }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const botRef = useRef<Required<StreamingProvider> | null>(null);

  useEffect(() => {
    if (!botRef.current) {
      try {
        const raw = streamingProvider ?? (createKorshiBot() as Partial<StreamingProvider>);
        botRef.current = makeSafeProvider(raw);
      } catch (e) {
        console.error("Failed to initialize chatbot provider:", e);
        botRef.current = {
          send: async () => ({ text: "Ошибка инициализации бота", intent: "error", confidence: 0 }),
          stream: undefined,
        };
      }
    }
  }, [streamingProvider]);

  // Загружаем историю
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Сохраняем историю
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages, storageKey]);

  // Добавляем приветственное сообщение при первой загрузке
  useEffect(() => {
    if (messages.length === 0) {
      const onboardingMsg: Message = {
        id: crypto.randomUUID(),
        role: "ai",
        text: ONBOARDING_PROMPT,
        timestamp: Date.now(),
        intent: "onboarding",
        confidence: 1,
      };
      setMessages([onboardingMsg]);
      setState("onboarding");
    }
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text, timestamp: Date.now() };
    setMessages((m) => [...m, userMsg]);

    // переключаем состояние диалога
    if (text.toLowerCase().includes("квартира") || text.toLowerCase().includes("жильё")) {
      setState("search");
    } else {
      setState("free");
    }

    const bot = botRef.current!;
    if (bot.stream) {
      setIsStreaming(true);
      const partialId = crypto.randomUUID();
      const initialBotMsg: Message = { id: partialId, role: "ai", text: "", timestamp: Date.now(), partial: true };
      setMessages((m) => [...m, initialBotMsg]);

      try {
        const stream = bot.stream(text);
        let accumulated = "";
        for await (const chunk of stream) {
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === partialId ? { ...msg, text: accumulated, partial: true } : msg))
          );
        }

        try {
          const final = await bot.send(text);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === partialId
                ? {
                    ...msg,
                    text: final.text,
                    partial: false,
                    intent: final.intent,
                    confidence: final.confidence,
                    links: final.links,
                    quickReplies: final.quickReplies,
                    timestamp: Date.now(),
                  }
                : msg
            )
          );
        } catch {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === partialId ? { ...msg, text: accumulated, partial: false, timestamp: Date.now() } : msg))
          );
        }
      } catch (e) {
        console.error("Streaming error:", e);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === partialId
              ? { ...msg, text: "Произошла ошибка при получении ответа.", partial: false, intent: "error", confidence: 0, timestamp: Date.now() }
              : msg
          )
        );
      } finally {
        setIsStreaming(false);
      }
    } else {
      setIsStreaming(true);
      try {
        const resp = await bot.send(text);
        const botMsg: Message = {
          id: crypto.randomUUID(),
          role: "ai",
          text: resp.text,
          timestamp: Date.now(),
          intent: resp.intent,
          confidence: resp.confidence,
          links: resp.links,
          quickReplies: resp.quickReplies,
          partial: false,
        };
        setMessages((m) => [...m, botMsg]);
      } catch (e) {
        console.error("Bot send error", e);
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "ai", text: "Произошла ошибка при обработке запроса.", timestamp: Date.now(), intent: "error", confidence: 0 },
        ]);
      } finally {
        setIsStreaming(false);
      }
    }
  }, []);

  return <ChatbotContext.Provider value={{ messages, sendMessage, isStreaming }}>{children}</ChatbotContext.Provider>;
};
