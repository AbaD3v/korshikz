"use client";

import { useEffect, useState } from "react";
import { useChatbot } from "./ChatbotProvider";
import { getModelProgress, getIsModelLoaded } from "@/chatbot-ai/createClientLLMBot";

export default function ChatbotBootstrap() {
  const { messages } = useChatbot();
  const [progress, setProgress] = useState(0);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Каждую секунду проверяем статус загрузки модели в фоне
    const interval = setInterval(() => {
      const p = getModelProgress();
      const loaded = getIsModelLoaded();
      
      setProgress(p);

      // Показываем баннер только если загрузка реально началась (p > 0) и еще не закончена
      if (p > 0 && p < 100) {
        setShowBanner(true);
      } else if (loaded) {
        // Плавное скрытие после загрузки
        setTimeout(() => setShowBanner(false), 3000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!showBanner) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] w-[300px]">
      <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-4 border border-blue-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 animate-pulse">
            Подготовка ИИ...
          </span>
          <span className="text-xs font-bold">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-blue-600 h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">
          Загружаем языковую модель для работы оффлайн
        </p>
      </div>
    </div>
  );
}