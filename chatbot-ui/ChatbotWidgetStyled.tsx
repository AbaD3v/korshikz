"use client";

import React, { useEffect, useRef, useState } from "react";
import { useChatbot, Message } from "./ChatbotProvider";
import useChatbotStreaming from "./useChatbotStreaming";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown"; 
import type { ChatMode } from "../chatbot-ai/router";

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

// --- КОМПОНЕНТ РЕНДЕРИНГА MARKDOWN (ССЫЛКИ) ---
const MarkdownRenderer = ({ content, isUser }: { content: string; isUser: boolean }) => {
  return (
    <ReactMarkdown
      components={{
        a: ({ node, ...props }) => (
          <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline font-bold transition-opacity hover:opacity-80 ${
              isUser ? "text-slate-900" : "text-white"
            }`}
          />
        ),
        p: ({ children }) => <span className="inline">{children}</span>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

// --- КОМПОНЕНТ ЭФФЕКТА ПЕЧАТИ ---
const TypingText = ({ text, speed = 0.015, onComplete }: { text: string; speed?: number; onComplete?: () => void }) => {
  const characters = text.split("");
  
  return (
    <motion.div className="inline">
      {characters.map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1, delay: index * speed }}
          onAnimationComplete={() => {
            if (index === characters.length - 1 && onComplete) onComplete();
          }}
        >
          {char}
        </motion.span>
      ))}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        className="inline-block w-1.5 h-4 ml-1 bg-current align-middle"
      />
    </motion.div>
  );
};

interface ChatbotWidgetProps {
  height?: string;
  mode?: ChatMode;
}

export default function ChatbotWidgetStyled({ height, mode = "smart" }: ChatbotWidgetProps) {
  const { messages, sendMessage, isStreaming } = useChatbot();
  const { partial } = useChatbotStreaming();
  const [input, setInput] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // Храним ID сообщений, которые уже закончили анимацию печати
  const [completedTyping, setCompletedTyping] = useState<Record<string, boolean>>({});

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const quickReplies = ["Как найти соседа?", "Сколько стоит аренда?", "Какие документы нужны?", "Кто твой создатель?"];

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, partial, messages[messages.length - 1]?.text]);

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
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim(), mode);
    setInput("");
  };

  return (
<div
      className="flex flex-col w-full h-full rounded-3xl shadow-2xl overflow-hidden relative border border-white/20 dark:border-slate-800 dark:bg-slate-900"
      style={{ 
        height: height || "100%", 
        position: "relative",
        // Применяем эффекты только если НЕ темная тема
        background: "var(--tw-background-opacity) === '1' ? '' : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.7) 100%)'",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Зеленый круг скрывается в темной теме через dark:hidden */}
      <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-green-500/10 rounded-full blur-[80px] pointer-events-none dark:hidden" />

      <style jsx global>{`
        /* Отключаем инлайновые стили фона и блюра для темной темы */
        :global(.dark) .rounded-3xl { 
          background: none !important; 
          backdrop-filter: none !important; 
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div
        ref={listRef}
        className="flex-1 w-full overflow-y-auto overflow-x-hidden px-3 py-4 space-y-6 no-scrollbar flex flex-col"
        style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
      >
        {messages.map((m: Message, index: number) => {
          const isUser = m.role === "user";
          const isPartial = m.partial;
          const isLastMessage = index === messages.length - 1;
          const isDoneTyping = completedTyping[m.id];

          return (
            <MotionDiv
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex"
            >
              <div className={`flex max-w-[85%] gap-2 items-end ${isUser ? "ml-auto" : "mr-auto"}`}>
                
                {!isUser && (
                  <motion.div
                    initial={{ scale: 0, x: -20 }}
                    animate={{ scale: 1, x: 0 }}
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm border self-end mb-1 bg-indigo-600 border-indigo-400"
                  >
                    <Bot size={14} className="text-white" />
                  </motion.div>
                )}

                <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <div className={`px-4 py-2 rounded-2xl shadow-sm border text-[14px] leading-relaxed ${
                    isUser 
                      ? "bg-white/20 text-black border-green-300 dark:border-green-700 rounded-tr-none" 
                      : "bg-indigo-600 dark:bg-slate-800 text-gray-200 border-slate-200 dark:border-slate-700 rounded-tl-none"
                  }`}>
                    {/* РЕШЕНИЕ ПРОБЛЕМЫ ТУТ */}
                    {!isUser && isLastMessage && !isPartial && !isDoneTyping ? (
                      <TypingText 
                        text={m.text} 
                        onComplete={() => setCompletedTyping(prev => ({ ...prev, [m.id]: true }))} 
                      />
                    ) : (
                      <MarkdownRenderer content={m.text} isUser={isUser} />
                    )}
                    
                    {isPartial && (
                      <span className="ml-2 text-[10px] italic opacity-60 block mt-1 pb-2">
                        {mode === "pro" ? "Продумывает детали..." : "Думает..."}
                      </span>
                    )}
                  </div>
                  {m.timestamp && (
                    <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
                  )}
                </div>

                {isUser && (
                  <motion.div
                    initial={{ scale: 0, x: 20 }}
                    animate={{ scale: 1, x: 0 }}
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm border self-end mb-1 bg-white/20 border-green-300 dark:border-green-700"
                  >
                    <User size={14} className="text-slate-700 dark:text-slate-200" />
                  </motion.div>
                )}
              </div>
            </MotionDiv>
          );
        })}
        <div ref={bottomRef} className="h-2 w-full shrink-0" />
      </div>

      <AnimatePresence>
        {!isStreaming && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-1 px-3 pb-3 pt-2 border-t border-slate-200 dark:border-slate-800"
          >
            {quickReplies.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q, mode)}
                className="px-4 py-1.5 rounded-full border border-white dark:border-slate-700 bg-white/10 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs hover:border-indigo-500 transition-colors"
              >
                {q}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="shrink-0 p-3 bg-white/10 backdrop-blur-md dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className="flex items-end gap-2 text-gray-200 backdrop-blur-md bg-white/70 dark:bg-white/5 rounded-2xl p-1.5 focus-within:ring-2 ring-indigo-500/20 transition-all"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
            placeholder={mode === "pro" ? "Спросите что угодно (Pro)..." : "Спросите AI..."}
            className="flex-1 bg-transparent   border-none focus:ring-0 resize-none py-2 px-3 text-[14px] text-gray-200 dark:text-slate-100 placeholder:text-slate-300"
            rows={1}
          />
          <MotionButton
            type="submit"
            disabled={!input.trim() || isStreaming}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              !input.trim() || isStreaming ? "bg-slate-300 dark:bg-slate-700 text-slate-500" : "bg-indigo-600 text-white shadow-lg"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </MotionButton>
        </form>
      </div>

      <AnimatePresence>
        {showScrollButton && (
          <MotionButton
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bg-white/5 backdrop-blur-md dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xl border border-slate-200 dark:border-slate-700 bottom-24 right-4 w-10 h-10 rounded-full flex items-center justify-center z-10"
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </MotionButton>
        )}
      </AnimatePresence>
    </div>
  );
}