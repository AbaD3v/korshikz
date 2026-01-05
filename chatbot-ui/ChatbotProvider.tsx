// /chatbot-ui/ChatbotProvider.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useMemo,
} from "react";

export type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
  partial?: boolean; // true while streaming
};

export type StreamingProvider = {
  // either provide async iterable of string chunks...
  stream?: (prompt: string) => AsyncIterable<string> | Promise<AsyncIterable<string>>;
  // ...or a simple send method that resolves once with the full text
  send?: (prompt: string) => Promise<string>;
};

export type ChatbotContextType = {
  messages: Message[];
  sendMessage: (text: string) => void;
  subscribe: (cb: (msg?: Message) => void) => () => void;
  streamingProvider?: StreamingProvider | undefined;
  // helpers
  isStreaming?: boolean;
  clear?: () => void;
  setStreamingProvider?: (p?: StreamingProvider) => void;
  getStreamingProvider?: () => StreamingProvider | undefined;
};

export const ChatbotContext = createContext<ChatbotContextType>({
  messages: [],
  sendMessage: () => {},
  subscribe: () => () => {},
  streamingProvider: undefined,
});

type ProviderProps = {
  children: ReactNode;
  initialMessages?: Message[];
  maxMessages?: number;
  storageKey?: string; // optional persistence
  streamingProvider?: StreamingProvider;
};

function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ChatbotProvider({
  children,
  initialMessages = [],
  maxMessages = 200,
  storageKey,
  streamingProvider: initialStreamingProvider,
}: ProviderProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined" && storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Message[];
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // ignore parse errors
      }
    }
    return initialMessages;
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const streamingProviderRef = useRef<StreamingProvider | undefined>(initialStreamingProvider);
  const subscribersRef = useRef(new Set<(msg?: Message) => void>());
  const activeStreamToken = useRef(0);
  const partialUpdateTimer = useRef<number | null>(null);

  // persist history (best-effort)
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // ignore storage errors
    }
  }, [messages, storageKey]);

  // cleanup on unmount: cancel active stream
  useEffect(() => {
    return () => {
      // increment token to cancel any running stream loops
      activeStreamToken.current += 1;
      // clear any scheduled partial flush
      if (partialUpdateTimer.current) {
        window.clearTimeout(partialUpdateTimer.current);
        partialUpdateTimer.current = null;
      }
    };
  }, []);

  const notify = useCallback((msg?: Message) => {
    subscribersRef.current.forEach((cb) => {
      try {
        cb(msg);
      } catch {
        // swallow subscriber errors
      }
    });
  }, []);

  const addMessage = useCallback(
    (m: Message) => {
      setMessages((prev) => {
        const next = [...prev, m].slice(-maxMessages);
        return next;
      });
      notify(m);
    },
    [maxMessages, notify]
  );

  const updateMessage = useCallback(
    (id: string, patch: Partial<Message>) => {
      setMessages((prev) => {
        let didChange = false;
        const next = prev.map((m) => {
          if (m.id !== id) return m;
          didChange = true;
          return { ...m, ...patch };
        });
        // if we didn't find the message id, keep prev unchanged
        if (!didChange) return prev;
        const updatedMsg = next.find((x) => x.id === id);
        if (updatedMsg) {
          // notify subscribers about updated message
          notify(updatedMsg);
        }
        return next;
      });
    },
    [notify]
  );

  const clear = useCallback(() => {
    setMessages([]);
    notify(undefined);
  }, [notify]);

  const subscribe = useCallback((cb: (msg?: Message) => void) => {
    subscribersRef.current.add(cb);
    // don't call immediately — let subscriber rely on messages array if needed
    return () => subscribersRef.current.delete(cb);
  }, []);

  const setStreamingProvider = useCallback((p?: StreamingProvider) => {
    streamingProviderRef.current = p;
  }, []);

  const getStreamingProvider = useCallback(() => streamingProviderRef.current, []);

  // sendMessage: creates user message and triggers AI flow via provider if available
  const sendMessage = useCallback(
    (text: string) => {
      const userMsg: Message = { id: genId(), role: "user", text, timestamp: Date.now() };
      addMessage(userMsg);

      const provider = streamingProviderRef.current;
      if (!provider) return;

      // cancel existing streams
      activeStreamToken.current += 1;
      const myToken = activeStreamToken.current;

      // create AI placeholder (streaming)
      const aiId = genId();
      const aiMsg: Message = {
        id: aiId,
        role: "ai",
        text: "",
        timestamp: Date.now(),
        partial: true,
      };
      addMessage(aiMsg);
      setIsStreaming(true);

      // helper: if cancelled return true
      const cancelled = () => activeStreamToken.current !== myToken;

      (async () => {
        try {
          if (provider.stream) {
            const iterable = await provider.stream(text);
            // accumulate chunks but throttle updates to avoid very frequent re-renders
            let acc = "";
            let lastFlush = Date.now();
            for await (const chunk of iterable) {
              if (cancelled()) return;
              acc += chunk;
              // throttle: flush at most every 60ms (configurable)
              const now = Date.now();
              if (now - lastFlush > 60) {
                // schedule immediate update
                updateMessage(aiId, { text: acc, partial: true });
                lastFlush = now;
              } else {
                // schedule a delayed flush if not already scheduled
                if (partialUpdateTimer.current === null) {
                  partialUpdateTimer.current = window.setTimeout(() => {
                    partialUpdateTimer.current = null;
                    updateMessage(aiId, { text: acc, partial: true });
                    lastFlush = Date.now();
                  }, 60 - (now - lastFlush));
                }
              }
            }
            if (cancelled()) return;
            // final flush
            if (partialUpdateTimer.current) {
              window.clearTimeout(partialUpdateTimer.current);
              partialUpdateTimer.current = null;
            }
            updateMessage(aiId, { text: acc, partial: false });
          } else if (provider.send) {
            const full = await provider.send(text);
            if (cancelled()) return;
            updateMessage(aiId, { text: full, partial: false });
          } else {
            updateMessage(aiId, {
              text: "AI provider missing implementation.",
              partial: false,
            });
          }
        } catch (err) {
          if (!cancelled()) {
            updateMessage(aiId, {
              text: `Ошибка: ${(err as Error)?.message ?? "unknown"}`,
              partial: false,
            });
          }
        } finally {
          // only clear streaming flag if still our token
          if (!cancelled()) setIsStreaming(false);
        }
      })();
    },
    [addMessage, updateMessage]
  );

  const ctxValue = useMemo(
    () => ({
      messages,
      sendMessage,
      subscribe,
      streamingProvider: streamingProviderRef.current,
      isStreaming,
      clear,
      setStreamingProvider,
      getStreamingProvider,
    }),
    [messages, sendMessage, subscribe, isStreaming, clear, setStreamingProvider, getStreamingProvider]
  );

  return <ChatbotContext.Provider value={ctxValue}>{children}</ChatbotContext.Provider>;
}
