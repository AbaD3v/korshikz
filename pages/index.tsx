"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MapPin, Sparkles, ArrowRight,
  Handshake, Zap, HeartHandshake, GraduationCap, ChevronDown
} from "lucide-react";

// Реальные районы по каждому городу
const CITY_DISTRICTS: Record<string, { value: string; label: string }[]> = {
  "Алматы": [
    { value: "", label: "Любой район" },
    { value: "bostandyk", label: "Бостандыкский" },
    { value: "medeu", label: "Медеуский" },
    { value: "alatau", label: "Алатауский" },
    { value: "almaly", label: "Алмалинский" },
    { value: "auezov", label: "Ауэзовский" },
    { value: "zhetisu", label: "Жетісуский" },
    { value: "nauryz", label: "Наурызбайский" },
    { value: "turksib", label: "Түрксіб" },
  ],
  "Астана": [
    { value: "", label: "Любой район" },
    { value: "esil", label: "Есільский" },
    { value: "almaty_astana", label: "Алматы" },
    { value: "saryarka", label: "Сарыарқа" },
    { value: "baikonyr", label: "Байқоңыр" },
    { value: "nura", label: "Нұра" },
  ],
  "Шымкент": [
    { value: "", label: "Любой район" },
    { value: "abay_shym", label: "Абай" },
    { value: "al_farabi", label: "Аль-Фараби" },
    { value: "enbekshi", label: "Еңбекші" },
    { value: "karatau", label: "Қаратау" },
  ],
  "Караганда": [
    { value: "", label: "Любой район" },
    { value: "kazybek", label: "Қазыбек би" },
    { value: "oktyabr", label: "Октябрь" },
  ],
};

const CITIES = Object.keys(CITY_DISTRICTS);

export default function Home() {
  const router = useRouter();

  const [city, setCity] = useState("Алматы");
  const [district, setDistrict] = useState("");
  const [search, setSearch] = useState("");
  const [cityOpen, setCityOpen] = useState(false);

  // Сбрасываем район при смене города
  useEffect(() => {
    setDistrict("");
  }, [city]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set("city", city);
    if (district) params.set("district", district);
    if (search.trim()) params.set("search", search.trim());
    router.push(`/listings?${params.toString()}`);
  };

  const districts = CITY_DISTRICTS[city] ?? [{ value: "", label: "Любой район" }];

  return (
    <div className="min-h-screen bg-[#FDFDFF] dark:bg-[#020617] text-slate-900 dark:text-white selection:bg-indigo-500 selection:text-white">
      <link rel="icon" href="public/favicon.ico" />
      {/* HERO */}
      <section className="relative pt-28 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-[-5%] left-[-10%] w-[45%] h-[45%] bg-indigo-500/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-blue-500/10 blur-[100px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-indigo-500 text-[10px] font-black uppercase tracking-[0.3em] mb-8"
          >
            <Zap size={14} className="fill-indigo-500" /> Студенческое комьюнити №1 в КЗ
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-[12vw] md:text-[9rem] font-[1000] italic uppercase tracking-[-0.07em] leading-[0.8] mb-10"
          >
            KORSHI KZ
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-12 font-medium leading-tight"
          >
            Находи сожителей по университету и интересам. <br className="hidden md:block" />
            Korshi — это про твоих людей и твой вайб.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-4"
          >
            <Link
              href="/listings"
              className="group relative px-10 py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black italic uppercase tracking-tighter overflow-hidden transition-all hover:shadow-[0_20px_40px_rgba(79,70,229,0.35)] active:scale-95 text-lg"
            >
              <span className="relative z-10 flex items-center gap-3">
                Найти сожителя <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-slate-900 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Link>

            <Link
              href="/create"
              className="px-10 py-6 border-2 border-slate-200 dark:border-slate-800 rounded-[2.5rem] font-black italic uppercase tracking-tighter hover:bg-slate-100 dark:hover:bg-slate-900 transition-all active:scale-95 text-lg"
            >
              Предложить комнату
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ПОИСК */}
      <section className="px-6 -mt-4 relative z-20 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl"
        >
          <div className="flex flex-col lg:flex-row items-stretch gap-2">

            {/* Поиск по имени/ВУЗу */}
            <div className="flex-1 flex items-center gap-4 px-6 py-4 rounded-[2.3rem] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <Search className="text-indigo-500 shrink-0" size={20} />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5">Поиск</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Имя, ВУЗ..."
                  className="w-full bg-transparent border-none outline-none font-bold text-lg placeholder:text-slate-300 dark:placeholder:text-slate-600 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="h-px lg:h-auto lg:w-px bg-slate-100 dark:bg-slate-800" />

            {/* Выбор города */}
            <div className="relative flex-1">
              <button
                onClick={() => setCityOpen(!cityOpen)}
                className="w-full flex items-center gap-4 px-6 py-4 rounded-[2.3rem] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
              >
                <MapPin className="text-indigo-500 shrink-0" size={20} />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5">Город</span>
                  <span className="font-bold text-lg text-slate-900 dark:text-white truncate">{city}</span>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform shrink-0 ${cityOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {cityOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    {CITIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setCity(c); setCityOpen(false); }}
                        className={`w-full px-5 py-3 text-left font-bold text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-slate-800 ${
                          city === c ? "text-indigo-600 bg-indigo-50/50 dark:bg-slate-800/50" : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-px lg:h-auto lg:w-px bg-slate-100 dark:bg-slate-800" />

            {/* Выбор района */}
            <div className="flex-1 flex items-center gap-4 px-6 py-4 rounded-[2.3rem] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <MapPin className="text-slate-400 shrink-0" size={20} />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5">Район</span>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-transparent border-none outline-none font-bold text-lg appearance-none cursor-pointer text-slate-900 dark:text-white"
                >
                  {districts.map((d) => (
                    <option key={d.value} value={d.value} className="dark:bg-slate-900">
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSearch}
              className="w-full lg:w-auto px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2.5rem] font-black uppercase italic text-sm tracking-[0.12em] hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white transition-all shadow-xl active:scale-95 whitespace-nowrap"
            >
              Найти мэтч
            </button>
          </div>
        </motion.div>
      </section>

      {/* USP */}
      <section className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 mb-4 italic">
            Как это работает
          </p>
          <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
            Больше, чем просто аренда
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<GraduationCap size={30} />}
            title="Только свои"
            desc="Верификация по ВУЗам. Находи сокурсников или ребят из дружественных университетов."
            index={0}
          />
          <FeatureCard
            icon={<HeartHandshake size={30} />}
            title="Твой вайб"
            desc="Спишь до обеда или встаёшь в 6 утра? Мы подберём соседа с таким же графиком жизни."
            index={1}
          />
          <FeatureCard
            icon={<Handshake size={30} />}
            title="Безопасный старт"
            desc="Смотри профили, читай отзывы и общайся в чате перед тем, как жать руки."
            index={2}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-28">
        <motion.div
          whileHover={{ scale: 0.998 }}
          className="max-w-7xl mx-auto rounded-[4rem] bg-indigo-600 p-16 md:p-28 overflow-hidden relative text-center"
        >
          <div className="relative z-10">
            <h2 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-white leading-[0.85] mb-10">
              Хватит жить <br /> в соло
            </h2>
            <Link
              href="/auth/register"
              className="inline-block px-14 py-7 bg-white text-indigo-600 rounded-[3rem] font-black italic uppercase tracking-tighter text-xl hover:bg-slate-900 hover:text-white transition-all active:scale-95 shadow-2xl"
            >
              Стать частью Korshi
            </Link>
          </div>
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
            <Sparkles size={600} className="text-white absolute -right-40 -top-40" />
          </div>
        </motion.div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc, index }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="p-10 rounded-[3rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 group"
    >
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/8 flex items-center justify-center text-indigo-500 mb-8 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-4 text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
        {desc}
      </p>
    </motion.div>
  );
}
