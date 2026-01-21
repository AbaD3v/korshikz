"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Search, MapPin, Sparkles, ArrowRight, 
  Handshake, Zap, HeartHandshake, GraduationCap 
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("Любой район");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (district !== "Любой район") params.set("district", district);
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] dark:bg-[#020617] text-slate-900 dark:text-white selection:bg-indigo-500 selection:text-white">
      
{/* --- HERO SECTION --- */}
<section className="relative pt-32 pb-24 px-6 overflow-hidden">
  {/* Анимированный фон (Soft Glow) */}
  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
    <div className="absolute top-[-5%] left-[-10%] w-[45%] h-[45%] bg-indigo-500/10 blur-[120px] rounded-full" />
    <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-blue-500/10 blur-[100px] rounded-full" />
  </div>

  <div className="max-w-7xl mx-auto text-center relative">
    {/* Бадж */}
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-indigo-500 text-[10px] font-black uppercase tracking-[0.3em] mb-10"
    >
      <Zap size={14} className="fill-indigo-500" /> Студенческое комьюнити №1 в КЗ
    </motion.div>

    {/* ГИГАНТСКИЙ КОМПАКТНЫЙ ЗАГОЛОВОК */}
    <motion.h1
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="text-[12vw] md:text-[10rem] font-[1000] italic uppercase tracking-[-0.07em] leading-[0.75] mb-12"
    >
      <span className="text-slate-900 dark:text-white">
        KORSHI KZ
      </span> 
    </motion.h1>

    {/* Описание */}
    <motion.p
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.8 }}
      className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-16 font-medium leading-tight"
    >
      Находи сожителей по университету и интересам. <br className="hidden md:block" /> 
      Korshi — это про твоих людей и твой вайб.
    </motion.p>

    {/* Кнопки действия */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.8 }}
      className="flex flex-col sm:flex-row justify-center items-center gap-5"
    >
      <Link href="/listings" className="group relative px-12 py-7 bg-indigo-600 text-white rounded-[2.5rem] font-black italic uppercase tracking-tighter overflow-hidden transition-all hover:shadow-[0_20px_40px_rgba(79,70,229,0.35)] active:scale-95 text-lg">
        <span className="relative z-10 flex items-center gap-3">
          Найти сожителя <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
        </span>
        <div className="absolute inset-0 bg-slate-900 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
      </Link>

      <Link href="/create" className="px-12 py-7 bg-transparent border-2 border-slate-200 dark:border-slate-800 rounded-[2.5rem] font-black italic uppercase tracking-tighter hover:bg-slate-100 dark:hover:bg-slate-900 transition-all active:scale-95 text-lg">
        Предложить комнату
      </Link>
    </motion.div>
  </div>
</section>

      {/* --- SMART SEARCH BAR --- */}
      <section className="px-6 -mt-12 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-slate-200 dark:border-slate-800 rounded-[3.5rem] shadow-2xl"
        >
          <div className="flex flex-col lg:flex-row items-center gap-2">
            
            <div className="flex-1 flex items-center gap-5 px-8 py-5">
              <Search className="text-indigo-500" size={24} />
              <div className="flex flex-col flex-1">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Где искать?</span>
                <input 
                  type="text" 
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Город (Алматы, Астана...)" 
                  className="w-full bg-transparent border-none outline-none font-bold text-xl placeholder:text-slate-300 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="h-12 w-[2px] bg-slate-100 dark:bg-slate-800 hidden lg:block" />
            
            <div className="flex-1 flex items-center gap-5 px-8 py-5">
              <MapPin className="text-slate-400" size={24} />
              <div className="flex flex-col flex-1">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Район</span>
                <select 
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-transparent border-none outline-none font-bold text-xl appearance-none cursor-pointer text-slate-900 dark:text-white"
                >
                  <option>Любой район</option>
                  <option value="almaty-medeu">Медеуский</option>
                  <option value="almaty-bostan">Бостандыкский</option>
                  <option value="astana-esil">Есильский</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleSearch}
              className="w-full lg:w-auto px-12 py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2.8rem] font-black uppercase italic text-sm tracking-[0.15em] hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white transition-all shadow-xl active:scale-95"
            >
              Подобрать мэтч
            </button>
          </div>
        </motion.div>
      </section>

      {/* --- USP SECTION (ПЕРЕОСМЫСЛЕННЫЕ ПРЕИМУЩЕСТВА) --- */}
      <section className="max-w-7xl mx-auto px-6 py-40">
        <div className="text-center mb-24">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 mb-6 italic">Как это работает</p>
          <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
            Больше, чем просто аренда
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          <FeatureCard 
            icon={<GraduationCap size={32} />}
            title="Только свои"
            desc="Верификация по ВУЗам. Находи сокурсников или ребят из дружественных университетов."
            index={0}
          />
          <FeatureCard 
            icon={<HeartHandshake size={32} />}
            title="Твой вайб"
            desc="Спишь до обеда или встаешь в 6 утра? Мы подберем соседа с таким же графиком."
            index={1}
          />
          <FeatureCard 
            icon={<Handshake size={32} />}
            title="Безопасный старт"
            desc="Смотри профили, читай отзывы и общайся в чате перед тем, как жать руки."
            index={2}
          />
        </div>
      </section>

      {/* --- CTA --- */}
      <section className="px-6 pb-32">
        <motion.div 
          whileHover={{ scale: 0.995 }}
          className="max-w-7xl mx-auto rounded-[5rem] bg-indigo-600 p-16 md:p-32 overflow-hidden relative text-center"
        >
          <div className="relative z-10">
            <h2 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-white leading-[0.85] mb-12">
              Хватит жить <br /> в соло
            </h2>
            <Link href="/auth/register" className="inline-block px-16 py-8 bg-white text-indigo-600 rounded-[3rem] font-black italic uppercase tracking-tighter text-xl hover:bg-slate-900 hover:text-white transition-all active:scale-95 shadow-2xl">
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

function FeatureCard({ icon, title, desc, index }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="p-12 rounded-[4rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 group"
    >
      <div className="w-20 h-20 rounded-3xl bg-indigo-500/5 flex items-center justify-center text-indigo-500 mb-10 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-6 text-slate-900 dark:text-white">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium text-lg">{desc}</p>
    </motion.div>
  );
}