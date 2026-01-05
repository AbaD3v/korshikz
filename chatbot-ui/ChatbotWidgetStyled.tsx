"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useContext,
  useLayoutEffect,
  FormEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatbotContext } from "./ChatbotProvider";
import useChatbotStreaming from "./useChatbotStreaming";

// You can control the widget height two ways:
// 1) Pass a `height` prop to the component: <ChatbotWidgetStyled height="280px" />
// 2) Set a CSS variable on the page: `:root { --chatbot-height: 280px }`
// The component will use the prop first, then the CSS variable, then the default.
export default function ChatbotWidgetStyled({ height }: { height?: string }) {
  const { messages, sendMessage, isStreaming } =
    useContext(ChatbotContext);
  const { partial } = useChatbotStreaming();

  const [input, setInput] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formHeight, setFormHeight] = useState<number>(0);

  const displayPartial =
    Boolean(partial) &&
    partial !== messages[messages.length - 1]?.text;

  /* ---------- textarea autosize ---------- */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  /* ---------- scroll detection ---------- */
  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const threshold = 80;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <
      threshold;
    setIsAtBottom(atBottom);
  }

  /* ---------- smart autoscroll ---------- */
  useEffect(() => {
    if (!isAtBottom) return;
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length, partial, isAtBottom]);

  /* ---------- measure input/form height ---------- */
  useLayoutEffect(() => {
    function update() {
      const h = formRef.current?.offsetHeight ?? 0;
      setFormHeight(h);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [input]);

  /* ---------- submit ---------- */
  function submit() {
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  return (
    <div
      className={`
        w-full sm:w-[360px]
        max-h-[70vh]
        bg-white dark:bg-gray-900
        text-gray-900 dark:text-gray-100
        rounded-t-3xl sm:rounded-3xl shadow-xl
        border border-gray-200 dark:border-gray-800
        flex flex-col
        overflow-hidden
        text-sm
      `}
      role="dialog"
      aria-label="Chatbot"
      style={{
        height:
          height ??
          (typeof window !== "undefined"
            ? (getComputedStyle(document.documentElement).getPropertyValue("--chatbot-height") || "320px")
            : "320px"),
        maxHeight: "70vh",
      }}
    >
      {/* ---------- HEADER ---------- */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-indigo-600 to-pink-600 text-white">
        <div className="font-semibold">Korshi Chat</div>
        <div className="text-xs opacity-80">
          Помощник по поиску соседей и аренде
        </div>
      </div>

      {/* ---------- MESSAGES (SCROLL) ---------- */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto px-4 py-4 bg-gray-50 dark:bg-gray-900"
        style={{
          // ensure messages area has bottom padding that matches the input/form
          paddingBottom: formHeight ? formHeight + 12 : 20,
        }}
      >
        <div className="flex flex-col gap-3">
          {messages.map((m: any) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${
                m.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`
                  max-w-[75%] px-4 py-2 rounded-2xl
                  leading-relaxed break-words
                  ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none"
                  }
                `}
                style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start" }}
              >
                {m.text}
                <div className="mt-1 text-[10px] opacity-70">
                  {new Date(m.timestamp).toLocaleTimeString(
                    [],
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* ---------- STREAMING PARTIAL ---------- */}
          <AnimatePresence>
            {displayPartial && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[75%] px-4 py-2 rounded-2xl bg-gray-300 dark:bg-gray-600 italic flex gap-1 rounded-bl-none">
                  {partial}
                  <span className="animate-pulse">▌</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* ---------- SCROLL TO BOTTOM ---------- */}
        {!isAtBottom && (
          <button
            onClick={() =>
              bottomRef.current?.scrollIntoView({
                behavior: "smooth",
              })
            }
            className="absolute right-4 bottom-4 px-3 py-1 rounded-full bg-gray-800 text-white text-xs shadow"
          >
            ↓ Вниз
          </button>
        )}
      </div>

      {/* ---------- INPUT (FIXED) ---------- */}
      <form
        ref={formRef}
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          submit();
        }}
        className="shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
      >
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            placeholder="Напиши сообщение…"
            className="flex-1 resize-none rounded-xl px-3 py-2 border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />

          <button
            type="submit"
            disabled={isStreaming}
            className="h-10 px-4 rounded-xl bg-indigo-600 text-white disabled:opacity-50"
          >
            →
          </button>
        </div>
      </form>
    </div>
  );
}
