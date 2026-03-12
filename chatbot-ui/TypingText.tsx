"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface TypingTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  animateOnlyNewText?: boolean;
  showCursor?: boolean;
  cursorClassName?: string;
}

function splitChars(value: string): string[] {
  return Array.from(value);
}

export function TypingText({
  text,
  speed = 10,
  onComplete,
  className,
  animateOnlyNewText = true,
  showCursor = true,
  cursorClassName,
}: TypingTextProps) {
  const characters = useMemo(() => splitChars(text), [text]);
  const [visibleCount, setVisibleCount] = useState(0);

  const prevTextRef = useRef("");
  const completedRef = useRef(false);

  useEffect(() => {
    const prevText = prevTextRef.current;
    if (prevText === text) return;

    completedRef.current = false;

    const prevChars = splitChars(prevText);

    if (animateOnlyNewText && text.startsWith(prevText)) {
      setVisibleCount(prevChars.length);
    } else {
      setVisibleCount(0);
    }

    prevTextRef.current = text;
  }, [text, animateOnlyNewText]);

  useEffect(() => {
    if (characters.length === 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    if (visibleCount >= characters.length) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 1, characters.length));
    }, speed);

    return () => window.clearTimeout(timer);
  }, [visibleCount, characters.length, speed, onComplete]);

  const visibleText = useMemo(() => {
    return characters.slice(0, visibleCount).join("");
  }, [characters, visibleCount]);

  return (
    <div className={className}>
      <span className="whitespace-pre-wrap break-words">{visibleText}</span>

      {showCursor && (
        <span
          className={[
            "inline-block h-[1em] w-[2px] ml-1 align-middle rounded-full animate-pulse bg-current transition-opacity duration-200",
            visibleCount < characters.length ? "opacity-100" : "opacity-0",
            cursorClassName ?? "",
          ].join(" ")}
        />
      )}
    </div>
  );
}