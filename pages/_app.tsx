import "@/styles/globals.css";
import { useState, useEffect } from "react";
import type { AppProps } from "next/app";

import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

import { ChatbotProvider } from "@/chatbot-ui/ChatbotProvider";
import ChatbotFloatingButton from "@/chatbot-ui/ChatbotFloatingButton";
import ChatbotBootstrap from "@/chatbot-ui/ChatbotBootstrap";

import { createKorshiBot } from "@/chatbot-ai/createKorshiBot";

export default function App({ Component, pageProps }: AppProps) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [city, setCity] = useState("Алматы");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <ChatbotProvider
      storageKey="korshi-chat"
      streamingProvider={createKorshiBot()}
    >
      {/* ДОБАВЛЕНО: 
        1. w-full - гарантирует, что контейнер не шире экрана.
        2. overflow-x-hidden - "срезает" вылетающие элементы (белую полосу).
        3. relative - для правильного позиционирования чат-кнопки.
      */}
      <div
        className={`
          min-h-screen w-full overflow-x-hidden relative flex flex-col
          ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900"}
        `}
      >
        <Header theme={theme} setTheme={setTheme} city={city} setCity={setCity} />

        {/* main теперь имеет flex-grow, чтобы футер всегда прижимался к низу, 
          а w-full не давал контенту распирать страницу.
        */}
        <main className="flex-grow w-full max-w-full">
          <Component {...pageProps} city={city} />
        </main>

        <Footer theme={theme} />
      </div>

      <ChatbotFloatingButton />
    </ChatbotProvider>
  );
}