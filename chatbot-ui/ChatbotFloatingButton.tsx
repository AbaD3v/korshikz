"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import ChatbotWidgetStyled from "./ChatbotWidgetStyled";
import { useChatbot } from "./ChatbotProvider"; // Используем хук вместо useContext
import { X, MessageCircle, ChevronDown } from "lucide-react";

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

export default function ChatbotFloatingButton() {
  // 1. Безопасно получаем контекст через хук
  const chatbot = useChatbot(); 
  
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ right: 24, bottom: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startRight: number; startBottom: number } | null>(null);

  // Достаем доп. данные, если они есть в контексте, или ставим дефолты
  const avatarUrl = (chatbot as any)?.botAvatarUrl;
  const botName = (chatbot as any)?.botName ?? "AI Assistant";
  const botSubtitle = (chatbot as any)?.botSubtitle ?? "Всегда на связи";

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

  // Важно для Next.js SSR
  if (!mounted) return null;

  const widget = (
    <AnimatePresence>
      {open && (
        <MotionDiv
          role="dialog"
          aria-modal="true"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={widgetVariants}
          drag={isMobile ? "y" : false}
          dragConstraints={{ top: 0, bottom: 0 }}
          onDragEnd={(_: any, info: any) => {
            if (isMobile && info.offset.y > 100) setOpen(false);
          }}
          className="shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden backdrop-blur-xl border border-white/40 dark:border-slate-700/50"
          style={{
            position: "fixed",
            zIndex: 2147483646,
            ...(isMobile
              ? { left: 0, right: 0, bottom: 0, height: "85vh", borderTopLeftRadius: 24, borderTopRightRadius: 24 }
              : { right: pos.right, bottom: pos.bottom + 80, width: 380, height: "min(655px, 75vh)", borderRadius: 28 })
          }}
        >
          {/* Header */}
          <div className="relative p-5 flex items-center justify-between shrink-0 backdrop-blur-md overflow-hidden bg-white/2">
            <div className="relative flex items-center gap-3 z-20 w-full text-black dark:text-white">
              <div className="relative shrink-0">
                <div className="w-12 h-10 rounded-full overflow-hidden bg-black/20 backdrop-blur-md border border-white/20">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={botName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-sm">AI</div>
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full animate-pulse" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-bold truncate text-[16px]">{botName}</div>
                <div className="text-[12px] text-gray-500 dark:text-white/80 truncate">{botSubtitle}</div>
              </div>
              <button
                aria-label="Закрыть чат"
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 rounded-xl transition-all duration-200 text-black dark:text-white"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Chat body */}
          <div className="flex-1 relative bg-white/2 dark:bg-black/2 overflow-hidden backdrop-blur-md">
            {/* Прокидываем данные из контекста в виджет */}
            <ChatbotWidgetStyled height="100%" />
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
          ref={containerRef}
          className="fixed z-[2147483647]"
          style={{ right: pos.right, bottom: pos.bottom }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <MotionButton
            ref={buttonRef}
            aria-expanded={open}
            aria-label="Открыть чат"
            onPointerDown={handlePointerDown}
            onClick={() => !isDragging && setOpen(!open)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={unread > 0 ? { scale: [1, 1.1, 1] } : {}}
            transition={unread > 0 ? { repeat: Infinity, duration: 1.5 } : {}}
            className="relative w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg flex items-center justify-center text-white"
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              border: "none",
              cursor: "pointer"
            }}
          >
            {open ? <ChevronDown size={30} /> : <MessageCircle size={28} fill="white" />}
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {unread}
              </span>
            )}
          </MotionButton>
        </MotionDiv>,
        document.body
      )}
    </>
  );
}