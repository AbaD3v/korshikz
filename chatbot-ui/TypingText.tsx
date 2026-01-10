"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface TypingTextProps {
  text: string;
  speed?: number; // задержка между символами в секундах
  onComplete?: () => void;
}

export const TypingText = ({ text, speed = 0.02, onComplete }: TypingTextProps) => {
  // Разбиваем текст на массив символов
  const characters = text.split("");

  return (
    <motion.div>
      {characters.map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.1,
            delay: index * speed, // каждый символ появляется со своей задержкой
          }}
          onAnimationComplete={() => {
            // Когда последний символ отрисован, вызываем колбэк
            if (index === characters.length - 1 && onComplete) {
              onComplete();
            }
          }}
        >
          {char}
        </motion.span>
      ))}
    </motion.div>
  );
};