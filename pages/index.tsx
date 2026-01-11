"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Search, MapPin, Sparkles, ArrowRight, 
  Building2, Users, ShieldCheck 
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  
  // Состояния для поиска
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("Любой район");

  // Функция поиска
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (district !== "Любой район") params.set("district", district);

    // Переход на страницу объявлений с параметрами
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] dark:bg-[#020617] text-slate-900 dark:text-white selection:bg-indigo-500 selection:text-white">
      
      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Фоновые градиенты (Декор) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-500/10 blur-[100px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/5 border border-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8"
          >
            <Sparkles size={14} /> New Era of Living
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.9] mb-8"
          >
            Korshi <span className="text-indigo-600">.</span> kz <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
              Жильё и Соседи
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-12 font-medium"
          >
            Первая в Казахстане платформа для поиска идеального сожительства. 
            Мы соединяем людей, а не просто сдаем квадратные метры.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex flex-col md:flex-row justify-center items-center gap-4"
          >
            <Link href="/listings" className="group relative px-10 py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black italic uppercase tracking-tighter overflow-hidden transition-transform active:scale-95">
              <span className="relative z-10 flex items-center gap-3">
                Найти жильё <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Link>

            <Link href="/create" className="px-10 py-6 bg-transparent border-2 border-slate-200 dark:border-slate-800 rounded-[2rem] font-black italic uppercase tracking-tighter hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors active:scale-95">
              Разместить объявление
            </Link>
          </motion.div>
        </div>
      </section>

      {/* --- SMART SEARCH BAR (ОЖИВЛЕННЫЙ) --- */}
      <section className="px-6 -mt-8 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
        >
          <div className="flex flex-col md:flex-row items-center gap-2">
            
            {/* Ввод Города */}
            <div className="flex-1 flex items-center gap-4 px-6 py-4">
              <Search className="text-indigo-500" size={24} />
              <input 
                type="text" 
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Где ищем? (Алматы, Астана...)" 
                className="w-full bg-transparent border-none outline-none font-bold text-lg placeholder:text-slate-400 text-slate-900 dark:text-white"
              />
            </div>

            <div className="h-10 w-[2px] bg-slate-100 dark:bg-slate-800 hidden md:block" />
            
            {/* Выбор Района */}
            <div className="flex-1 flex items-center gap-4 px-6 py-4">
              <MapPin className="text-slate-400" size={24} />
              <select 
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-transparent border-none outline-none font-bold text-lg appearance-none cursor-pointer text-slate-900 dark:text-white"
              >
                <option>Любой район</option>
                <option value="almaty-medeu">Медеуский</option>
                <option value="almaty-bostan">Бостандыкский</option>
                <option value="astana-esil">Есильский</option>
                <option value="astana-almaty">Алматинский</option>
              </select>
            </div>

            {/* Кнопка Поиска */}
            <button 
              onClick={handleSearch}
              className="w-full md:w-auto px-12 py-5 bg-indigo-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-indigo-600 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
            >
              Search
            </button>
          </div>
        </motion.div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section className="max-w-7xl mx-auto px-6 py-32">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 mb-4">Core Benefits</p>
            <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter">
              Почему выбирают <br /> наш сервис
            </h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xs">
            Мы переосмыслили аренду жилья, сделав фокус на личности соседа и прозрачности данных.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Building2 size={32} />}
            title="Проверка жилья"
            desc="Все объявления проходят модерацию. Только реальные фото и проверенные адреса."
            index={0}
          />
          <FeatureCard 
            icon={<Users size={32} />}
            title="Алгоритм Match"
            desc="Мы сравниваем ваш режим дня и привычки, чтобы найти идеального соседа."
            index={1}
          />
          <FeatureCard 
            icon={<ShieldCheck size={32} />}
            title="Безопасность"
            desc="Ваши контакты защищены. Общайтесь внутри платформы до момента сделки."
            index={2}
          />
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="px-6 pb-20">
        <motion.div 
          whileHover={{ scale: 0.99 }}
          className="max-w-7xl mx-auto rounded-[4rem] bg-indigo-600 p-12 md:p-24 overflow-hidden relative"
        >
          <div className="relative z-10 text-center md:text-left">
            <h2 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter text-white leading-none mb-8">
              Готов найти <br /> свой новый дом?
            </h2>
            <Link href="auth/register" className="inline-block px-12 py-6 bg-white text-indigo-600 rounded-[2rem] font-black italic uppercase tracking-tighter hover:bg-slate-100 transition-colors active:scale-95">
              Начать бесплатно
            </Link>
          </div>
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
             <Sparkles size={400} className="text-white absolute -right-20 -top-20" />
          </div>
        </motion.div>
      </section>
    </div>
  );
}

// Вспомогательный компонент для карточек преимуществ
function FeatureCard({ icon, title, desc, index }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.2 }}
      className="group p-10 rounded-[3rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 transition-all shadow-sm hover:shadow-xl hover:shadow-indigo-500/5"
    >
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/5 flex items-center justify-center text-indigo-500 mb-8 group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-4 text-slate-900 dark:text-white">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{desc}</p>
    </motion.div>
  );
}