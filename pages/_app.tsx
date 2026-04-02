import "@/styles/globals.css";
import { useEffect, useState } from "react";
import type { AppProps } from "next/app";

import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

import { ChatbotProvider } from "@/chatbot-ui/ChatbotProvider";
import ChatbotFloatingButton from "@/chatbot-ui/ChatbotFloatingButton";
import { createKorshiBot } from "@/chatbot-ai/createKorshiBot";

import { Toaster } from "sonner";

type ThemeMode = "light" | "dark";

export default function App({ Component, pageProps }: AppProps) {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [city, setCity] = useState("Алматы");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("korshi-theme") as ThemeMode | null;
    const savedCity = localStorage.getItem("korshi-city");

    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }

    if (savedCity) {
      setCity(savedCity);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;

    localStorage.setItem("korshi-theme", theme);
  }, [theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("korshi-city", city);
  }, [city, hydrated]);

  if (!hydrated) return null;

  return (
    <ChatbotProvider
      storageKey="korshi-chat"
      streamingProvider={createKorshiBot()}
    >
      <div
        className={`min-h-screen w-full overflow-x-hidden relative flex flex-col transition-colors duration-300 ${
          theme === "dark"
            ? "bg-[#0f1117] text-white"
            : "bg-white text-gray-900"
        }`}
      >
        <Header
          theme={theme}
          setTheme={setTheme}
          city={city}
          setCity={setCity}
        />

        <main className="flex-grow w-full max-w-full">
          <Component {...pageProps} globalCity={city} />
        </main>

        <Footer theme={theme} />
      </div>

      <ChatbotFloatingButton />

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