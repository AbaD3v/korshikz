"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { FaLinkedin, FaGithub, FaSearch, FaExternalLinkAlt, FaSortAlphaDown, FaSortAlphaUp, FaSteam } from "react-icons/fa";
import { Sparkles, Code2, Rocket, Heart, ShieldCheck, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- ТИПЫ И ДАННЫЕ (Твои оригинальные данные) ---
type Social = { linkedin?: string; github?: string; steam?: string };
type Dev = { name: string; role: string; bio?: string; photo?: string; social?: Social; isLead?: boolean };

const DEFAULT_DEVS: Dev[] = [
  {
    name: "Маметжан Абзал",
    isLead: true, // Добавил флаг для визуального выделения
    role: "Fullstack Developer | DevOps | UI/UX Designer | Project Lead",
    bio: "Привет! Я Абзал, создатель Korshi.kz. Я прошел путь от первой строчки кода до настройки DNS и AI-интеграций. Моя цель — создать продукт, который реально решает проблему дорогих аренд квартир в большом городе Казахстана.",
    photo: "https://github.com/AbaD3v.png",
    social: {
      linkedin: "https://www.linkedin.com/in/abzal-mametzhan-63264a388/",
      github: "https://github.com/AbaD3v",
      steam: "https://steamcommunity.com/profiles/76561199236726053/"
    },
  },
  {
    name: "Болатов Диас",
    role: "CTO & Co-Founder | QA Engineer | UI Assistant",
    bio: "Привет! Я Диас. Я слежу за тем, чтобы техническая часть Korshi работала как часы. Моя работа — тестирование, поддержка пользователей и доведение интерфейса до идеала. Всегда открыт к фидбеку!",
    photo: "https://github.com/DiasD3v.png",
    social: {
      linkedin: "https://www.linkedin.com/in/%D0%B1%D0%BE%D0%BB%D0%B0%D1%82%D0%BE%D0%B2-%D0%B4%D0%B8%D0%B0%D1%81-282a5b39a/",
      github: "https://github.com/DiasD3v",
      steam: "https://steamcommunity.com/profiles/76561199731766042/"
    },
  },
];

// --- ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ (Стиль обновлен) ---

const Avatar = ({ src, name, size = 150, isLead }: { src?: string; name: string; size?: number; isLead?: boolean }) => {
  return (
    <div className={`relative p-1 rounded-full ${isLead ? 'bg-gradient-to-tr from-indigo-500 to-purple-500' : 'bg-slate-200 dark:bg-slate-800'}`}>
      <img
        src={src || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`}
        alt={name}
        className="rounded-full object-cover bg-white dark:bg-slate-900"
        style={{ width: size, height: size }}
      />
      {isLead && (
        <div className="absolute -top-2 -right-2 bg-indigo-500 text-white p-2 rounded-full shadow-lg">
          <Sparkles size={16} />
        </div>
      )}
    </div>
  );
};

export default function About() {
  const [selected, setSelected] = useState<Dev | null>(null);
  
  return (
    <div className="min-h-screen bg-[#FDFDFF] dark:bg-[#020617] text-slate-900 dark:text-white pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* --- HEADER / MANIFESTO --- */}
        <header className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/5 border border-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] mb-6"
          >
            Behind the Scenes
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none mb-8"
          >
            Мы создаем <span className="text-indigo-600 underline decoration-indigo-200">Korshi</span> <br />
            вдвоем. С душой.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium"
          >
            Korshi.kz — это не просто код. Это проект двух единомышленников, которые верят, что поиск жилья в Казахстане может быть прозрачным и дружелюбным.
          </motion.p>
        </header>

        {/* --- FOUNDERS GRID --- */}
        <div className="grid md:grid-cols-2 gap-8 mb-32">
          {DEFAULT_DEVS.map((dev, idx) => (
            <motion.div
              key={dev.name}
              initial={{ opacity: 0, x: idx === 0 ? -50 : 50 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ y: -10 }}
              onClick={() => setSelected(dev)}
              className="group cursor-pointer relative p-8 md:p-12 rounded-[3rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 transition-all shadow-sm hover:shadow-2xl overflow-hidden"
            >
              {/* Background Glow */}
              <div className={`absolute -top-24 -right-24 w-64 h-64 blur-[80px] rounded-full opacity-10 ${dev.isLead ? 'bg-indigo-500' : 'bg-blue-500'}`} />

              <div className="relative z-10 flex flex-col items-center text-center">
                <Avatar src={dev.photo} name={dev.name} isLead={dev.isLead} />
                
                <h2 className="mt-8 text-3xl font-black italic uppercase tracking-tighter">
                  {dev.name}
                </h2>
                
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {dev.role.split('|').map((r, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider rounded-full text-slate-500 dark:text-slate-400">
                      {r.trim()}
                    </span>
                  ))}
                </div>

                <p className="mt-6 text-slate-600 dark:text-slate-400 font-medium leading-relaxed line-clamp-3">
                  {dev.bio}
                </p>

                <div className="mt-8 flex gap-4">
                   <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors">
                     View More <FaExternalLinkAlt size={10} />
                   </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* --- TECH STACK SECTION --- */}
        <section className="py-20 border-t border-slate-100 dark:border-slate-800">
          <div className="text-center mb-16">
            <h3 className="text-2xl font-black italic uppercase tracking-tighter">Our Weapon of Choice</h3>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
             {['Next.js 14', 'Supabase', 'Tailwind CSS', 'Framer Motion', 'Vercel', 'Resend', 'YandexMaps', "Трудолюбие"].map((tech) => (
               <div key={tech} className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-center font-bold text-slate-400">
                 {tech}
               </div>
             ))}
          </div>
        </section>
      </div>

      {/* --- MODAL (Neo-Modern style) --- */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[70] w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <button onClick={() => setSelected(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                ✕
              </button>
              
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                <Avatar src={selected.photo} name={selected.name} size={110} isLead={selected.isLead} />
                <div className="text-center md:text-left">
                  <h4 className="text-4xl font-black italic uppercase tracking-tighter mb-2">{selected.name}</h4>
                  <p className="text-indigo-500 font-bold text-sm mb-6 uppercase tracking-[0.1em]">{selected.role}</p>
                  <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed mb-8">
                    {selected.bio}
                  </p>
                  
                  <div className="flex flex-wrap gap-5 justify-center md:justify-start">
                    <a href={selected.social?.github} target="_blank" className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:scale-105 transition-transform">
                      <FaGithub size={18} /> GitHub
                    </a>
                    <a href={selected.social?.linkedin} target="_blank" className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0077b5] text-white font-bold text-sm hover:scale-105 transition-transform">
                      <FaLinkedin size={18} /> LinkedIn
                    </a>
                    <a href={selected.social?.steam} target="_blank" className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#1b2838] text-white font-bold text-sm hover:scale-105 transition-transform">
                      <FaSteam size={18} /> Steam
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}