import "@/styles/globals.css";
import { useState, useEffect } from "react";
import type { AppProps } from "next/app";

import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

import { ChatbotProvider } from "@/chatbot-ui/ChatbotProvider";
import ChatbotFloatingButton from "@/chatbot-ui/ChatbotFloatingButton";
import ChatbotBootstrap from "@/chatbot-ui/ChatbotBootstrap";

import { createKorshiBot } from "@/chatbot-ai/createKorshiBot";

import { Toaster } from "sonner"; // ✅ ДОБАВЛЕНО

export default function App({ Component, pageProps }: AppProps) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [city, setCity] = useState("Алматы");

  // переключение dark класса
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <ChatbotProvider
      storageKey="korshi-chat"
      streamingProvider={createKorshiBot()}
    >
      <div
        className={`
          min-h-screen w-full overflow-x-hidden relative flex flex-col transition-colors duration-300
          ${
            theme === "dark"
              ? "bg-[#0f1117] text-white"
              : "bg-white text-gray-900"
          }
        `}
      >
        <Header
          theme={theme}
          setTheme={setTheme}
          city={city}
          setCity={setCity}
        />

        <main className="flex-grow w-full max-w-full">
          <Component {...pageProps} city={city} />
        </main>

        <Footer theme={theme} />
      </div>

      <ChatbotFloatingButton />

      {/* 🔥 Toast контейнер (обязателен для sonner) */}
      <Toaster
        richColors
        position="top-right"
        toastOptions={{
          className:
            "rounded-xl shadow-xl border border-gray-200 dark:border-gray-700",
        }}
      />
    </ChatbotProvider>
  );
}