"use client";

import React, { useState } from "react";
import { FaLinkedin, FaGithub, FaSteam } from "react-icons/fa";
import { Sparkles, Code2, Rocket, Heart, Globe, Cpu, Zap, X, ShieldCheck} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- ДАННЫЕ ---
const DEFAULT_DEVS = [
  {
    name: "Маметжан Абзал",
    isLead: true,
    role: "Lead Developer | UI Designer",
    bio: "Создатель Korshi.kz. Прошел путь от идеи на салфетке до полноценной платформы. Верю, что технологии должны упрощать жизнь, а не усложнять её.",
    photo: "https://github.com/AbaD3v.png",
    skills: ["Next.js", "System Design", "UI/UX"],
    social: {
      linkedin: "https://www.linkedin.com/in/abzal-mametzhan-63264a388/",
      github: "https://github.com/AbaD3v",
      steam: "https://steamcommunity.com/profiles/76561199236726053/"
    },
  },
  {
    name: "Болатов Диас",
    role: "CTO | QA Engineer",
    bio: "Слежу за тем, чтобы каждая кнопка работала, а данные были в безопасности. Ответственный за стабильность и качество пользовательского опыта.",
    photo: "https://github.com/DiasD3v.png",
    skills: ["Testing", "Security", "Backend"],
    social: {
      linkedin: "https://www.linkedin.com/in/%D0%B1%D0%BE%D0%BB%D0%B0%D1%82%D0%BE%D0%B2-%D0%B4%D0%B8%D0%B0%D1%81-282a5b39a/",
      github: "https://github.com/DiasD3v",
      steam: "https://steamcommunity.com/profiles/76561199731766042/"
    },
  },
];

const Avatar = ({ src, name, size = 160, isLead }: any) => (
  <div className="relative group">
    <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity ${isLead ? 'bg-indigo-500' : 'bg-blue-500'}`} />
    <div className={`relative p-1.5 rounded-full ${isLead ? 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-blue-500' : 'bg-slate-200 dark:bg-slate-800'}`}>
      <img
        src={src || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`}
        alt={name}
        className="rounded-full object-cover bg-white dark:bg-slate-950"
        style={{ width: size, height: size }}
      />
    </div>
    {isLead && (
      <motion.div 
        animate={{ rotate: [0, 15, -15, 0] }}
        transition={{ repeat: Infinity, duration: 4 }}
        className="absolute -top-1 -right-1 bg-indigo-600 text-white p-2.5 rounded-full shadow-xl border-4 border-white dark:border-[#020617]"
      >
        <Sparkles size={18} />
      </motion.div>
    )}
  </div>
);

export default function About() {
  const [selected, setSelected] = useState<any>(null);

  return (
    <div className="min-h-screen bg-[#FDFDFF] dark:bg-[#020617] text-slate-900 dark:text-white pt-40 pb-20 px-6 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-7xl mx-auto">
        
        {/* --- HEADER --- */}
        <header className="max-w-4xl mb-32">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 text-indigo-500 font-black uppercase tracking-[0.3em] text-[10px] mb-8"
          >
            <span className="w-12 h-[2px] bg-indigo-500" /> Crew & Vision
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-[1000] italic uppercase tracking-[-0.05em] leading-[0.85] mb-10"
          >
            МЫ СТРОИМ <br /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">БУДУЩЕЕ</span> <br />
            АРЕНДЫ ВМЕСТЕ.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed"
          >
            Korshi.kz — это проект двух студентов, которые устали от проблемного поиска жилья. Мы создаем платформу, где важен человек, а не только квадратные метры.
          </motion.p>
        </header>

        {/* --- FOUNDERS --- */}
        <div className="grid md:grid-cols-2 gap-10 mb-40">
          {DEFAULT_DEVS.map((dev, idx) => (
            <motion.div
              key={dev.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelected(dev)}
              className="group cursor-pointer relative p-10 md:p-14 rounded-[4rem] bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 hover:border-indigo-500/30 transition-all shadow-sm hover:shadow-2xl overflow-hidden backdrop-blur-sm"
            >
              <div className="relative z-10 flex flex-col items-center text-center">
                <Avatar src={dev.photo} name={dev.name} isLead={dev.isLead} />
                
                <h2 className="mt-10 text-4xl font-black italic uppercase tracking-tighter group-hover:text-indigo-500 transition-colors">
                  {dev.name}
                </h2>
                <p className="mt-3 text-indigo-500/80 font-bold uppercase tracking-widest text-xs">
                  {dev.role.split('|')[0]}
                </p>

                <p className="mt-8 text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-sm">
                  {dev.bio}
                </p>

                <div className="mt-10 flex gap-3">
                  {dev.skills.map(skill => (
                    <span key={skill} className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* --- STACK --- */}
        <section className="py-32 border-t border-slate-100 dark:border-slate-900">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-xl">
              <h3 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter">Наш Стек</h3>
              <p className="text-slate-500 mt-4 font-medium text-lg">Используем самые современные инструменты для быстрой и безопасной работы сервиса.</p>
            </div>
            <Zap className="text-indigo-500 hidden md:block" size={60} />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Next.js 15', icon: <Globe size={20} /> },
              { name: 'Supabase', icon: <ShieldCheck size={20} /> },
              { name: 'Tailwind', icon: <Zap size={20} /> },
              { name: 'Framer', icon: <Heart size={20} /> },
            ].map((tech) => (
              <div key={tech.name} className="flex items-center justify-center gap-3 p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-black uppercase italic tracking-wider text-sm hover:border-indigo-500/30 transition-all">
                <span className="text-indigo-500">{tech.icon}</span>
                {tech.name}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* --- MODAL --- */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[4rem] p-10 md:p-16 shadow-2xl border border-white/10 overflow-hidden"
            >
              <button 
                onClick={() => setSelected(null)} 
                className="absolute top-8 right-8 p-3 rounded-full bg-slate-100 dark:bg-slate-800 hover:rotate-90 transition-all duration-300"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center">
                <Avatar src={selected.photo} name={selected.name} size={140} isLead={selected.isLead} />
                <h4 className="mt-10 text-5xl font-black italic uppercase tracking-tighter">{selected.name}</h4>
                <p className="mt-2 text-indigo-500 font-black uppercase tracking-[0.2em] text-xs">{selected.role}</p>
                
                <p className="mt-8 text-slate-600 dark:text-slate-300 font-medium text-lg leading-relaxed">
                  {selected.bio}
                </p>
                
                <div className="mt-12 flex flex-wrap gap-4 justify-center">
                  <SocialLink href={selected.social?.github} icon={<FaGithub size={22} />} label="GitHub" color="bg-slate-950" />
                  <SocialLink href={selected.social?.linkedin} icon={<FaLinkedin size={22} />} label="LinkedIn" color="bg-blue-600" />
                  <SocialLink href={selected.social?.steam} icon={<FaSteam size={22} />} label="Steam" color="bg-slate-800" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SocialLink({ href, icon, label, color }: any) {
  return (
    <a href={href} target="_blank" className={`flex items-center gap-3 px-8 py-4 rounded-[2rem] ${color} text-white font-black uppercase italic tracking-widest text-xs hover:scale-105 transition-transform shadow-xl`}>
      {icon} {label}
    </a>
  );
}