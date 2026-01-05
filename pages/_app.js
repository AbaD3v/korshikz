import "/styles/globals.css";
import { useState, useEffect } from "react";

import Header from "/components/Header";
import Footer from "/components/Footer";

import ChatbotProvider from "/chatbot-ui/ChatbotProvider";
import ChatbotFloatingButton from "/chatbot-ui/ChatbotFloatingButton";
import ChatbotBootstrap from "/chatbot-ui/ChatbotBootstrap";

export default function App({ Component, pageProps }) {
  const [theme, setTheme] = useState("light");
  const [city, setCity] = useState("Алматы");

  // theme sync
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <ChatbotProvider storageKey="korshi-chat">
      <ChatbotBootstrap />

      <div
        className={
          theme === "dark"
            ? "bg-gray-900 text-white min-h-screen"
            : "bg-white text-gray-900 min-h-screen"
        }
      >
        <Header
          theme={theme}
          setTheme={setTheme}
          city={city}
          setCity={setCity}
        />

        <main className="min-h-screen">
          <Component {...pageProps} city={city} />
        </main>

        <Footer theme={theme} />
      </div>

      <ChatbotFloatingButton />
    </ChatbotProvider>
  );
}
