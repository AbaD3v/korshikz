"use client";

import React, { useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  UserCircle, 
  Settings, 
  ArrowLeft, 
  Share2, 
  Sparkles,
  ShieldCheck
} from "lucide-react";

import UserProfile from "../../components/UserProfile";
import UserListings from "../../components/UserListings";
import EditProfileForm from "../../components/EditProfileForm";

/* --- Типы данных --- */
export type ProfilePublicData = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  birthday?: string | null;
  city?: string | null;
  university?: string | null;
  faculty?: string | null;
  course?: number | null;
  study_type?: string | null;
  is_student?: boolean | null;
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_location?: string | null;
  need_furnished?: boolean | null;
  room_type?: string | null;
  wake_time?: string | null;
  sleep_time?: string | null;
  cleanliness_level?: number | null;
  noise_tolerance?: number | null;
  introvert_extrovert?: string | null;
  lifestyle?: string | null;
  smoking?: boolean | null;
  pets?: boolean | null;
  hobbies?: string | null;
  bio?: string | null;
  preferred_gender?: string | null;
  preferred_age_min?: number | null;
  preferred_age_max?: number | null;
  preferred_pets?: boolean | null;
  preferred_smoking?: boolean | null;
  about_me?: string | null;
};

export type Listing = { 
  id: string | number; 
  title?: string; 
  [k: string]: any 
};

type Props = {
  initialProfile: ProfilePublicData | null;
  initialListings: Listing[];
  isOwner: boolean;
};

const createSupabase = (url?: string, key?: string) => {
  if (!url || !key) return null;
  return createClient(url, key);
};

export default function ProfilePage({ initialProfile, initialListings, isOwner }: Props) {
  const [profile, setProfile] = useState<ProfilePublicData | null>(initialProfile);
  const [listings] = useState<Listing[]>(initialListings);
  const [editing, setEditing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Исправляем Hydration Error
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#020617] transition-colors">
        <div className="text-center animate-in fade-in zoom-in duration-500 px-4">
          <UserCircle size={100} strokeWidth={1} className="mx-auto text-slate-200 dark:text-slate-800 mb-6" />
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Профиль не найден</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-8 text-balance">Возможно, ссылка устарела или профиль был удален пользователем.</p>
          <Link href="/" className="inline-flex items-center gap-3 px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black italic uppercase tracking-tighter shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all active:scale-95">
            <ArrowLeft size={18} /> Вернуться назад
          </Link>
        </div>
      </div>
    );
  }

  const handleProfileUpdated = (updates: Partial<ProfilePublicData>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] dark:bg-[#020617] transition-colors duration-700 font-sans antialiased">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-16 space-y-12">
        
        {/* TOP BAR / CONTROL PANEL */}
        <header className="flex justify-between items-center">
          <Link href="/listings" className="group flex items-center gap-3 font-black uppercase text-[10px] tracking-[0.3em] text-slate-400 hover:text-indigo-500 transition-all">
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group-hover:border-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm">
              <ArrowLeft size={16} />
            </div>
            <span className="hidden sm:inline">Назад к поиску</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <button className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-indigo-500 hover:scale-105 transition-all shadow-sm active:scale-90">
              <Share2 size={20} />
            </button>
            
            {!isOwner ? (
              <Link href={`/chat/${profile.id}`}>
                <button className="flex items-center gap-3 px-8 py-4 bg-[#22C55E] text-white rounded-[1.5rem] font-black italic uppercase tracking-tighter shadow-xl shadow-green-500/20 hover:scale-105 active:scale-95 transition-all">
                  <MessageSquare size={20} />
                  Написать
                </button>
              </Link>
            ) : (
              <button 
                onClick={() => setEditing(!editing)}
                className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black italic uppercase tracking-tighter transition-all shadow-xl ${
                  editing 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" 
                  : "bg-indigo-600 text-white shadow-indigo-500/20 hover:scale-105 active:scale-95"
                }`}
              >
                {editing ? <ArrowLeft size={20} /> : <Settings size={20} />}
                {editing ? "Отмена" : "Настроить"}
              </button>
            )}
          </div>
        </header>

        <main>
          <AnimatePresence mode="wait">
            {!editing ? (
              <motion.div 
                key="view"
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-16"
              >
                {/* PROFILE CARD WRAPPER */}
                <section className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200" />
                  <div className="relative bg-white dark:bg-slate-900/60 backdrop-blur-xl rounded-[3rem] p-6 md:p-14 shadow-2xl border border-white dark:border-slate-800">
                    <UserProfile
                      profile={profile}
                      listings={listings}
                      isOwner={isOwner}
                      onProfileUpdated={() => setEditing(true)}
                    />
                  </div>
                </section>
                
                {/* LISTINGS SECTION */}
                <section className="space-y-10">
                  <div className="flex items-center gap-6 px-4">
                    <h3 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3 shrink-0">
                      <Sparkles size={28} className="text-indigo-500" /> 
                      Объявления
                    </h3>
                    <div className="h-[2px] w-full bg-slate-100 dark:bg-slate-800/50 rounded-full" />
                  </div>
                  
                  <div className="px-2">
                    <UserListings listings={listings} />
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div 
                key="edit"
                initial={{ opacity: 0, scale: 0.98 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-8 md:p-14 shadow-2xl"
              >
                <div className="mb-12">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Personal Settings</span>
                  </div>
                  <h2 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                    Редактировать <span className="text-indigo-500 underline decoration-indigo-500/20 underline-offset-8">профиль</span>
                  </h2>
                </div>
                
                <EditProfileForm 
                  profile={profile} 
                  onSave={handleProfileUpdated} 
                  onCancel={() => setEditing(false)} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <style jsx global>{`
        /* Стилизация скролла */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #6366f133; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #6366f1; }
        
        /* Глобальные фиксы для темной темы */
        .dark body { background-color: #020617; }
      `}</style>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params?.id;
  if (!id || Array.isArray(id)) {
    return { props: { initialProfile: null, initialListings: [], isOwner: false } };
  }

  const supabaseServer = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!supabaseServer) {
    return { props: { initialProfile: null, initialListings: [], isOwner: false } };
  }

  const selectFields = `
    id, full_name, email, avatar_url, birthday, city, university, faculty, course, 
    study_type, is_student, budget_min, budget_max, preferred_location, 
    need_furnished, room_type, wake_time, sleep_time, cleanliness_level, 
    noise_tolerance, introvert_extrovert, lifestyle, smoking, pets, 
    hobbies, bio, preferred_gender, preferred_age_min, preferred_age_max, 
    preferred_pets, preferred_smoking, about_me
  `;

  // Получаем профиль
  const { data: profile } = await supabaseServer
    .from("profiles")
    .select(selectFields)
    .eq("id", id)
    .maybeSingle();

  // Получаем объявления
  const { data: listings } = await supabaseServer
    .from("listings")
    .select("*")
    .eq("user_id", id)
    .order("id", { ascending: false });

  return {
    props: {
      initialProfile: profile ?? null,
      initialListings: listings ?? [],
      isOwner: false, // Эту логику нужно будет дополнить проверкой сессии (см. рекомендации ранее)
    },
  };
};