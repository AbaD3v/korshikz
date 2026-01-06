// /chatbot-ui/ChatbotWidgetStyled.tsx
"use client";

import React, {
  useEffect,
  useRef,
  useState,
  FormEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatbot, Message } from "./ChatbotProvider";
import useChatbotStreaming from "./useChatbotStreaming";

// 🔧 Хук автоскролла
function useAutoScroll(
  listRef: React.RefObject<HTMLDivElement>,
  bottomRef: React.RefObject<HTMLDivElement>,
  deps: any[]
) {
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const threshold = 50;
        const atBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
        setIsAtBottom(atBottom);
      });
    };

    el.addEventListener("scroll", handleScroll);
    // initial check
    handleScroll();

    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (!isAtBottom) return;
    const el = listRef.current;
    if (!el) return;
    // smooth to bottom
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [...deps, isAtBottom]);

  return isAtBottom;
}

export default function ChatbotWidgetStyled({ height }: { height?: string }) {
  const { messages, sendMessage, isStreaming } = useChatbot();
  const { partial } = useChatbotStreaming();

  const [input, setInput] = useState("");

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const quickReplies = [
    "Как найти соседа?",
    "Сколько стоит аренда?",
    "Какие документы нужны?",
    "Можно с животными?",
    "Как работает Korshi.kz?",
    "Есть ли гарантии?",
  ];

  const isAtBottom = useAutoScroll(listRef, bottomRef, [
    messages.length,
    partial,
    isStreaming,
  ]);

  // Автогровинг textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  function submit() {
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput("");
    textareaRef.current?.style.setProperty("height", "auto");
    textareaRef.current?.focus();
  }

  function sendQuickReply(reply: string) {
    sendMessage(reply);
    setInput("");
    textareaRef.current?.focus();
  }

  function formatTime(ts?: number) {
    try {
      if (!ts) return "";
      return new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  const SendIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );

  const ArrowDownIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18 }}
      className="relative flex flex-col w-full sm:w-[400px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
      style={{ height: height || "560px", maxHeight: "560px" }}
      role="dialog"
      aria-label="Чат Korshi.kz"
    >
      {/* Кнопка закрытия */}
      <button
        onClick={() => console.log("Закрыть чат")}
        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
        aria-label="Закрыть чат"
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Сообщения */}
      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2 bg-gray-100 dark:bg-gray-900 pb-3 relative"
        role="log"
        aria-live="polite"
      >
        <div className="flex flex-col gap-2">
          {messages.map((m: Message) => {
            const isUser = m.role === "user";
            const isAi = m.role === "ai";
            const isStreamingMsg = isAi && m.partial;

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] px-3 py-3 rounded-xl ${
                    isUser
                      ? "bg-green-100 text-black dark:bg-green-900 dark:text-white rounded-br-sm"
                      : "bg-blue-100 text-black dark:bg-blue-500 dark:text-white rounded-bl-sm"
                  } ${isStreamingMsg ? "pr-4" : ""}`}
                >
                  {/* Основной текст */}
                  <div className="whitespace-pre-wrap text-[14px] leading-[1.5]">
                    {m.text}
                    {isStreamingMsg && (
                      <span className="ml-0.5 inline-block w-1.5 h-3.5 bg-current align-middle animate-pulse" />
                    )}
                  </div>

                  {/* Ссылки */}
                  {isAi && m.links && m.links.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {m.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          className="text-[13px] text-indigo-600 dark:text-indigo-300 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Быстрые ответы */}
                  {isAi && m.quickReplies && m.quickReplies.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.quickReplies.map((qr) => (
                        <button
                          key={qr}
                          onClick={() => sendMessage(qr)}
                          className="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                          type="button"
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Метаданные */}
                  {isAi && m.intent && (
                    <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      {m.intent}
                      {typeof m.confidence === "number" &&
                        ` (уверенность: ${Math.round(m.confidence * 100)}%)`}
                    </div>
                  )}

                  {/* Время */}
                  <div className="mt-1 text-[11px] md:text-[12px] text-gray-600 dark:text-gray-300">
                    {formatTime(m.timestamp)}
                  </div>
                </div>
              </motion.div>
            );
          })}

          <div ref={bottomRef} className="h-0 w-full" />
        </div>

        {/* Кнопка вниз */}
        <AnimatePresence>
          {!isAtBottom && messages.length > 1 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() =>
                listRef.current?.scrollTo({
                  top: listRef.current.scrollHeight,
                  behavior: "smooth",
                })
              }
              className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-indigo-500 text-white shadow-md hover:bg-indigo-600 flex items-center justify-center z-10"
              aria-label="Прокрутить вниз"
              type="button"
            >
              <ArrowDownIcon />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Быстрые ответы */}
      <div className="flex flex-wrap gap-2 px-3 pb-2 py-2 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        {quickReplies.map((q) => (
          <button
            key={q}
            onClick={() => sendQuickReply(q)}
            className="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
            type="button"
            aria-label={`Быстрый ответ: ${q}`}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Инпут */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            submit();
          }}
          className="px-4 pb-3 pt-2 py-2"
        >
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={1}
              placeholder="Напишите сообщение..."
              aria-label="Текст сообщения"
              className="flex-1 resize-none px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-[14px] text-gray-900 dark:text-gray-100 max-h-20"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-disabled={!input.trim()}
              className={`rounded-lg flex items-center justify-center ${
                !input.trim()
                  ? "h-9 w-9 md:h-10 md:w-10 bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed"
                  : "h-9 w-9 md:h-10 md:w-10 bg-indigo-500 text-white hover:bg-indigo-600"
              }`}
            >
              <SendIcon />
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
