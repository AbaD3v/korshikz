// ChatbotFloatingButton.tsx
"use client";

import React, { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import ChatbotWidgetStyled from "./ChatbotWidgetStyled";
import { ChatbotContext, Message } from "./ChatbotProvider";
// сверху файла, замените существующий импорт lucide-react на этот
import { X, Minus } from "lucide-react";


export default function ChatbotFloatingButton() {
  const ctx = useContext(ChatbotContext);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ right: 24, bottom: 80 });
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const [widgetHeight, setWidgetHeight] = useState(0);
  const dragRef = useRef<{ startX: number; startY: number; startRight: number; startBottom: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    function update() {
      const h = widgetRef.current?.offsetHeight ?? 0;
      setWidgetHeight(h);
    }
    if (open) update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function update() {
      setIsMobile(window.innerWidth < 640);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);
const avatarUrl = (ctx as any)?.botAvatarUrl ?? null;
const botName = (ctx as any)?.botName ?? "KorshiAI";
const botSubtitle = (ctx as any)?.botSubtitle ?? "Помогу найти жильё и ответить на вопросы";
const botStatus = (ctx as any)?.botStatus ?? "online"; // "online" | "away" | "offline"

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRight: pos.right,
      startBottom: pos.bottom,
    };

    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPos({
        right: Math.max(8, Math.round(dragRef.current.startRight - dx)),
        bottom: Math.max(8, Math.round(dragRef.current.startBottom - dy)),
      });
    };

    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  if (!mounted) return null;

  const widget = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          style={
            (() => {
              if (isMobile)
                return {
                  position: "fixed",
                  left: 8,
                  right: 8,
                  bottom: Math.max(8, pos.bottom),
                  zIndex: 2147483646,
                };
              const maxBottom = Math.max(8, window.innerHeight - widgetHeight - 8);
              const desired = pos.bottom - 65;
              const bottom = Math.min(desired, maxBottom);
              return { position: "fixed", right: pos.right, bottom, zIndex: 2147483646 };
            })()
          }
        >
{/* Красивый хедер — заменяет старый блок */}
<div
  className="flex items-center justify-between py-2 pt-2 rounded-t-xl"
  style={{
    background: isMobile
      ? "linear-gradient(90deg,#4f46e5 0%, #7c3aed 50%)"
      : "linear-gradient(90deg,#0ea5a4 0%, #06b6d4 50%, #7c3aed 100%)",
    color: "#fff",
  }}
>
  {/* Левый блок: аватар + имя */}
  <div className="flex items-center gap-3 min-w-0">
    <div className="relative w-10 h-10  rounded-xl overflow-hidden flex-shrink-0 shadow-lg ring-1 ring-white/20 bg-white/5">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={botName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-white/10">
          <span className="text-white font-semibold text-lg">AI</span>
        </div>
      )}

      {/* статус */}
      <span
        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
          botStatus === "online" ? "bg-green-400" : botStatus === "away" ? "bg-yellow-400" : "bg-gray-400"
        }`}
        aria-hidden
      />
    </div>

    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold leading-tight truncate">{botName}</div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/90">AI</span>
      </div>
      <div className="text-xs text-white/90 truncate" style={{ maxWidth: 300 }}>
        {botSubtitle}
      </div>
    </div>
  </div>

  {/* Правый блок: действия */}
  <div className="flex items-center gap-2">
    <button
      onClick={() => {
        // мягкая micro-interaction
        setPulse(true);
        setTimeout(() => setPulse(false), 220);
        // сворачиваем (оставляем плавающую кнопку)
        setOpen(false);
      }}
      aria-label="Свернуть"
      className="p-1 rounded-md hover:bg-white/10 transition"
      title="Свернуть"
      style={{ color: "white" }}
    >
      <Minus size={16} />
    </button>

    <button
      onClick={() => {
        setPulse(true);
        setTimeout(() => setPulse(false), 160);
        setOpen(false);
      }}
      aria-label="Закрыть чат"
      className="p-1 rounded-md hover:bg-white/10 transition"
      title="Закрыть"
      style={{ color: "white" }}
    >
      <X size={18} />
    </button>
  </div>
</div>

          {isMobile ? (
            <div style={{ borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: "hidden" }}>
              <ChatbotWidgetStyled height="70vh" />
            </div>
          ) : (
            <div
              ref={widgetRef}
              style={{
                width: 360,
                height: "70vh",
                maxHeight: "70vh",
                borderRadius: 12,
                overflow: "hidden",
                background: "transparent",
              }}
            >
              <ChatbotWidgetStyled height="100%" />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const button = (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        right: pos.right,
        bottom: pos.bottom,
        zIndex: 2147483647,
        // Плавающая кнопка теперь всегда видима (включая мобильные)
      }}
    >
      <button
        ref={buttonRef}
        onPointerDown={onPointerDown}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Закрыть чат" : "Открыть чат поддержки"}
        style={{
          width: 56,
          height: 56,
          borderRadius: "9999px",
          background: "#4f46e5",
          color: "#fff",
          boxShadow: "0 6px 18px rgba(99,102,241,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          border: "none",
          position: "relative",
        }}
      >
        <span
          style={{
            transform: pulse ? "scale(1.08)" : undefined,
            transition: "transform .2s",
            fontSize: 20,
            lineHeight: 1,
          }}
        >
          💬
        </span>
        {unread > 0 && (
          <span style={{ position: "absolute", top: -6, right: -6 }}>
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold leading-none text-white bg-red-500 rounded-full">
              {unread > 99 ? "99+" : unread}
            </span>
          </span>
        )}
      </button>
    </div>
  );

  return (
    <>
      {createPortal(widget, document.body)}
      {createPortal(button, document.body)}
    </>
  );
}
