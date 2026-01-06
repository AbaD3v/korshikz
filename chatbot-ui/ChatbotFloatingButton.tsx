// ChatbotFloatingButton.tsx
"use client";

import React, { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import ChatbotWidgetStyled from "./ChatbotWidgetStyled";
import { ChatbotContext, Message } from "./ChatbotProvider";

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
              const desired = pos.bottom-65;
              const bottom = Math.min(desired, maxBottom);
              return { position: "fixed", right: pos.right, bottom, zIndex: 2147483646 };
            })()
          }
        >
          {isMobile ? (
            <ChatbotWidgetStyled height="70vh" />
          ) : (
            <div
              ref={widgetRef}
              style={{ width: 360, height: "70vh", maxHeight: "70vh" }}
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
        display: open && isMobile ? "none" : undefined,
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
