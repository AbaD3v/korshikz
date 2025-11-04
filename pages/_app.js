import "/styles/globals.css";
import { useState, useEffect } from "react";
import Header from "/components/Header";
import Footer from "/components/Footer";

export default function App({ Component, pageProps }) {
  const [theme, setTheme] = useState("light");
  const [city, setCity] = useState("Алматы"); // ✅ Добавили состояние города

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className={theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900"}>
      {/* Передаём city и setCity в Header */}
      <Header theme={theme} setTheme={setTheme} city={city} setCity={setCity} />
      
      <main className="min-h-screen">
        {/* Передаём город дальше — если нужно фильтровать объявления */}
        <Component {...pageProps} city={city} />
      </main>

      <Footer theme={theme} />
    </div>
  );
}
