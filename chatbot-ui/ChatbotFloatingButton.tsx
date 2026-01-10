"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import ChatbotWidgetStyled from "./ChatbotWidgetStyled";
import { useChatbot } from "./ChatbotProvider";
import { X, MessageCircle, ChevronDown, Sparkles, Zap } from "lucide-react";
import type { ChatMode } from "../chatbot-ai/router";

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

export default function ChatbotFloatingButton() {
  const chatbot = useChatbot(); 
  
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<ChatMode>("smart"); // Состояние режима
  const [pos, setPos] = useState({ right: 24, bottom: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const dragRef = useRef<{ startX: number; startY: number; startRight: number; startBottom: number } | null>(null);

  const avatarUrl = (chatbot as any)?.botAvatarUrl;
  const botName = (chatbot as any)?.botName ?? "Korshi AI";
  const botSubtitle = (chatbot as any)?.botSubtitle ?? "Поиск недвижимости";

  useEffect(() => {
    setMounted(true);
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(false);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRight: pos.right,
      startBottom: pos.bottom,
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) setIsDragging(true);
      setPos({
        right: Math.max(16, dragRef.current.startRight - dx),
        bottom: Math.max(16, dragRef.current.startBottom - dy),
      });
    };

    const onPointerUp = () => {
      dragRef.current = null;
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  const widgetVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } },
    exit: { opacity: 0, y: 20, scale: 0.95 }
  };

  if (!mounted) return null;

  const widget = (
    <AnimatePresence>
      {open && (
        <MotionDiv
          role="dialog"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={widgetVariants}
          className="shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden backdrop-blur-xl border border-white/40 dark:border-slate-700/50"
          style={{
            position: "fixed",
            zIndex: 2147483646,
            ...(isMobile
              ? { left: 0, right: 0, bottom: 0, height: "85vh", borderTopLeftRadius: 24, borderTopRightRadius: 24 }
              : { right: pos.right, bottom: pos.bottom + 80, width: 380, height: "min(655px, 75vh)", borderRadius: 28 })
          }}
        >
          {/* Header */}
          <div className="relative p-4 flex items-center backdrop-blur-md justify-between shrink-0 bg-white/2 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 w-full">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/30 dark:bg-white/5 border border-indigo-200 dark:border-indigo-800">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={botName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400">K</div>
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-slate-900 rounded-full" />
              </div>

              {/* Name & Subtitle */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 dark:text-white truncate text-sm leading-tight">{botName}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{botSubtitle}</div>
              </div>

              {/* MODE TOGGLE (SMART / PRO) */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setMode("smart")}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    mode === "smart"
                      ? "bg-white/70 dark:bg-white shadow-sm text-indigo-600 dark:text-indigo-400 border border-indigo-600 dark:border-indigo-600"
                      : "text-slate-400 backdrop-blur-md dark:text-slate-500"
                  }`}
                >
                  <Zap size={10} fill={mode === "smart" ? "currentColor" : "none"} />
                  ECO
                </button>
                <button
                  onClick={() => setMode("pro")}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    mode === "pro"
                      ? "bg-white/70 dark:bg-indigo-600 shadow-sm text-red-500 dark:text-red-800 border border-red-400 dark:border-red-700"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <Sparkles size={10} fill={mode === "pro" ? "currentColor" : "none"} />
                  PRO
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setOpen(false)}
                className="ml-1 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1  backdrop-blur-md relative bg-white/2 dark:bg-slate-950/50 overflow-hidden">
            {/* Передаем режим в виджет */}
            <ChatbotWidgetStyled height="100%" mode={mode} />
          </div>
        </MotionDiv>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {createPortal(widget, document.body)}
      {createPortal(
        <MotionDiv
          className="fixed z-[2147483647]"
          style={{ right: pos.right, bottom: pos.bottom }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <MotionButton
            onPointerDown={handlePointerDown}
            onClick={() => !isDragging && setOpen(!open)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl flex items-center justify-center text-white overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            }}
          >
            <AnimatePresence mode="wait">
              {open ? (
                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                  <ChevronDown size={32} />
                </motion.div>
              ) : (
                <motion.div key="open" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                  <MessageCircle size={28} fill="white" />
                </motion.div>
              )}
            </AnimatePresence>
          </MotionButton>
        </MotionDiv>,
        document.body
      )}
    </>
  );
}