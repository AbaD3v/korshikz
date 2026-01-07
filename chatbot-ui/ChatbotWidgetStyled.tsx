"use client";

import React, { useEffect, useRef, useState } from "react";
import { useChatbot, Message } from "./ChatbotProvider";
import useChatbotStreaming from "./useChatbotStreaming";
import { motion, AnimatePresence } from "framer-motion";

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

export default function ChatbotWidgetStyled({ height }: { height?: string }) {
  const { messages, sendMessage, isStreaming } = useChatbot();
  const { partial } = useChatbotStreaming();
  const [input, setInput] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const quickReplies = ["Как найти соседа?", "Сколько стоит аренда?", "Какие документы нужны?"];

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, partial]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setShowScrollButton(!nearBottom);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  const submit = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div
      className="flex flex-col w-full h-full rounded-2xl shadow-lg overflow-hidden bg-slate-50 dark:bg-slate-950"
      style={{ height: height || "100%", position: "relative" }}
    >
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Сообщения */}
      <div
        ref={listRef}
        className="flex-1 w-full overflow-y-auto overflow-x-hidden px-3 py-4 space-y-4 no-scrollbar"
        style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
      >
        {messages.map((m: Message, idx: number) => {
          const isUser = m.role === "user";
          return (
            <MotionDiv
              key={m.id || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                  isUser
                    ? "bg-green-400 dark:bg-white/5 border border-blue-600 dark:border-slate-700 text-white shadow-md"
                    : "bg-indigo-600 border border-white/20 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                }`}
              >
                <div className="text-[14px] leading-relaxed whitespace-pre-wrap">{m.text}</div>
              </div>
            </MotionDiv>
          );
        })}
        {isStreaming && (
          <div className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">AI печатает…</div>
        )}
        <div ref={bottomRef} className="h-2 w-full shrink-0" />
      </div>

      {/* Quick replies */}
      <div className="flex gap-2 px-3 pb-2">
        {quickReplies.map((q) => (
          <button
            key={q}
            onClick={() => sendMessage(q)}
            className="px-1 py-1 pt-1.5 rounded-full backdrop-blur-md border border-white/20 bg-white/5 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 text-sm transition shadow-sm"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Поле ввода */}
      <div className="shrink-0 p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-end gap-2 bg-black/30 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 shadow-inner"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Спросите AI..."
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 px-3 text-[14px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            rows={1}
          />
          <MotionButton
  type="submit"
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="w-11 h-11 rounded-full flex items-center justify-center 
             bg-gradient-to-r from-indigo-500 to-purple-600 
             text-white shadow-lg backdrop-blur-md 
             transition-all duration-200"
>
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
</MotionButton>

        </form>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <MotionButton
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bg-indigo-600 backdrop-blur-md text-white shadow-lg bottom-24 right-4 w-10 h-10 rounded-full flex items-center justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            ↓
          </MotionButton>
        )}
      </AnimatePresence>
    </div>
  );
}
