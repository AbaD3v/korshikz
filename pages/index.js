// pages/index.js
import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-900 text-gray-900 dark:text-gray-100">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center py-24 px-6">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight"
        >
          Korshi.kz — жильё и соседи по душе 🏡
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10"
        >
          Найди комнату, квартиру или надёжного соседа в своём городе. 
          Просто, быстро и бесплатно.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <Link
            href="/listings"
            className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold shadow hover:bg-blue-700 dark:hover:bg-blue-600 transition"
          >
            🔍 Смотреть объявления
          </Link>
          <Link
            href="/create"
            className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-gray-700 px-6 py-3 rounded-xl font-semibold shadow hover:bg-blue-50 dark:hover:bg-gray-700 transition"
          >
            ➕ Разместить своё
          </Link>
        </motion.div>
      </section>

      {/* Search Section */}
  <section className="bg-white dark:bg-gray-800 py-16 px-6 shadow-inner">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-xl mx-auto text-center"
        >
          <h2 className="text-2xl font-bold mb-4">🔎 Быстрый поиск</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Введи город и найди жильё рядом с тобой.
          </p>
          <div className="flex items-center justify-center gap-3">
            <input
              type="text"
              placeholder="Например: Алматы"
              className="input max-w-sm"
            />
            <button className="btn">
              Искать
            </button>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-10">
        {[
          {
            title: "🏠 Простые объявления",
            desc: "Добавляй жильё за пару минут — без сложных форм и ожиданий.",
          },
          {
            title: "👫 Поиск соседей",
            desc: "Найди людей с похожими интересами и раздели аренду.",
          },
          {
            title: "⚡ Быстро и удобно",
            desc: "Современный дизайн, всё работает с телефона и компьютера.",
          },
        ].map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
            className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow hover:shadow-lg transition border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* CTA Footer Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="text-center py-20 bg-blue-600 dark:bg-blue-500 text-white"
      >
        <h2 className="text-3xl md:text-4xl font-semibold mb-6">
          Начни поиск жилья уже сегодня 🌆
        </h2>
        <Link
          href="/listings"
          className="bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 font-semibold px-8 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          Смотреть все объявления
        </Link>
      </motion.section>
    </div>
  );
}
