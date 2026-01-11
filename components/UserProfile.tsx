"use client";

import React from "react";
import Image from "next/image";
import AvatarUploader from "../components/AvatarUploader";
import { motion } from "framer-motion";

import {
  MapPin, Book, Home, Heart, User, Info, Calendar, 
  Sparkles, Zap, Moon, Sun, Coffee, Check, ShieldCheck
} from "lucide-react";

// ---------------- HELPERS ----------------
const money = (n?: number | null) =>
  n == null ? "—" : `${n.toLocaleString()} ₸`;

function Card({ children, className = "" }: any) {
  return (
    <div className={`bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-slate-100 dark:border-slate-800/50 p-8 shadow-sm transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
}
// ---------------- TYPES ----------------
export type Profile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  about_me?: string | null;
  bio?: string | null;
  birthday?: string | null;
  university?: string | null;
  faculty?: string | null;
  course?: number | null;
  study_type?: string | null;
  city?: string | null;
  room_type?: string | null;
  preferred_location?: string | null;
  preferred_gender?: string | null;
  preferred_age_min?: number | null;
  preferred_age_max?: number | null;
  preferred_pets?: boolean | null;
  preferred_smoking?: boolean | null;
  budget_min?: number | null;
  budget_max?: number | null;
  need_furnished?: boolean | null;
  wake_time?: string | null;
  sleep_time?: string | null;
  noise_tolerance?: number | null;
  cleanliness_level?: number | null;
  introvert_extrovert?: string | null;
  lifestyle?: string | null;
  pets?: boolean | null;
  smoking?: boolean | null;
  hobbies?: string | null;
  email?: string | null;
  phone?: string | null;
  is_student?: boolean | null; // Добавил, так как используем в коде
};

export type Listing = {
  id: string | number;
  title?: string | null;
  price?: number | null;
  description?: string | null;
  city?: string | null;
  bedrooms?: number | null;
  images?: string[] | null;
  created_at?: string | null;
};

// --------------- SUBCOMPONENTS ----------------

function ProfileHeader({ profile, isOwner, listingsCount, onEdit }: any) {
  return (
    <Card className="relative overflow-hidden !p-10 border-indigo-500/10 dark:border-indigo-500/20">
      {/* Фоновое свечение */}
      <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
      
      <div className="flex flex-col md:flex-row gap-10 items-center md:items-start relative z-10">
        {/* Аватар с премиум-рамкой */}
        <div className="relative group">
          <div className="w-40 h-40 rounded-[3.5rem] overflow-hidden bg-slate-100 dark:bg-slate-800 ring-4 ring-white dark:ring-[#020617] shadow-2xl transition-transform group-hover:scale-105 duration-500">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.full_name ?? "avatar"} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                <User size={64} strokeWidth={1.5} />
              </div>
            )}
            {isOwner && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <AvatarUploader userId={profile.id} initialUrl={profile.avatar_url} />
              </div>
            )}
          </div>
          {/* Badge за верификацию или статус */}
          <div className="absolute -bottom-2 -right-2 bg-indigo-500 text-white p-3 rounded-2xl shadow-xl shadow-indigo-500/40">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="flex-1 text-center md:text-left space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
               <span className="px-4 py-1.5 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-indigo-500/20">
                 {profile.is_student ? "Student" : "Professional"}
               </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-[0.85]">
              {profile.full_name || "Anonymous User"}
            </h1>
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</span>
              <span className="text-sm font-bold dark:text-white flex items-center gap-1">
                <MapPin size={14} className="text-indigo-500" /> {profile.city || "Almaty"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activity</span>
              <span className="text-sm font-bold dark:text-white flex items-center gap-1">
                <Sparkles size={14} className="text-amber-500" /> {listingsCount} Listings
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
function AboutCard({ profile }: any) {
  // 1. Пытаемся получить дату из разных источников (birthday или birth_date)
  const dateValue = profile?.birthday || profile?.birth_date;
  
  // 2. Форматируем дату максимально безопасно
  let displayDate = "—";
  
  if (dateValue) {
    try {
      const d = new Date(dateValue);
      // Проверяем, что это не "Invalid Date"
      if (!isNaN(d.getTime())) {
        displayDate = d.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } else {
        // Если Date не справился (иногда бывает с форматами строк), пробуем просто вернуть строку
        displayDate = String(dateValue).split('T')[0]; 
      }
    } catch (e) {
      displayDate = String(dateValue);
    }
  }

  return (
    <Card className="md:col-span-2">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-1">Manifesto</p>
          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">Обо мне</h3>
        </div>
        <div className="p-4 bg-indigo-500/5 rounded-3xl text-indigo-500">
          <Info size={24} />
        </div>
      </div>

      <div className="text-xl font-medium italic leading-relaxed text-slate-600 dark:text-slate-300 border-l-4 border-indigo-500 pl-6 py-2">
        "{profile?.about_me || profile?.bio || "Пользователь пока не заполнил свой манифест."}"
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
         <InfoBlock 
            label="Birth Date" 
            value={displayDate} 
            icon={<Calendar size={16}/>} 
         />
         <InfoBlock 
            label="Personality" 
            value={profile?.introvert_extrovert || "—"} 
            icon={<Heart size={16}/>} 
         />
         <InfoBlock 
            label="University" 
            value={profile?.university || "—"} 
            icon={<Book size={16}/>} 
         />
      </div>
    </Card>
  );
}

function PreferencesCard({ profile }: any) {
  return (
    <Card className="bg-slate-900 dark:bg-white text-white dark:text-slate-900">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-6">Target Search</p>
      <div className="space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest opacity-50 text-indigo-400">Target Budget</p>
          <p className="text-3xl text-black font-black italic uppercase tracking-tighter">
            {money(profile.budget_min)} — {money(profile.budget_max)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-black">
          <PreferenceItem label="Room Type" value={profile.room_type} />
          <PreferenceItem label="Gender" value={profile.preferred_gender} />
          <PreferenceItem label="Age Range" value={`${profile.preferred_age_min}-${profile.preferred_age_max}`} />
          <PreferenceItem label="Pets OK" value={profile.preferred_pets ? "Yes" : "No"} />
        </div>
      </div>
    </Card>
  );
}

function LifestyleCard({ profile }: any) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl"><Zap size={20} /></div>
        <h3 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white leading-none">Vibe Check</h3>
      </div>
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-6">
           <div className="flex items-center gap-3">
             {profile.wake_time === 'morning' ? <Sun size={20} className="text-amber-500"/> : <Coffee size={20} className="text-indigo-500"/>}
             <div>
               <p className="text-[10px] font-black uppercase text-slate-400">Wake Up</p>
               <p className="font-bold dark:text-white">{profile.wake_time || "Flexible"}</p>
             </div>
           </div>
           <div className="flex items-center gap-3">
             <Moon size={20} className="text-slate-400"/>
             <div>
               <p className="text-[10px] font-black uppercase text-slate-400">Sleep</p>
               <p className="font-bold dark:text-white">{profile.sleep_time || "Flexible"}</p>
             </div>
           </div>
        </div>
        
        <div className="space-y-6">
          <LevelBar label="Cleanliness" level={profile.cleanliness_level} color="bg-green-500" />
          <LevelBar label="Noise Tolerance" level={profile.noise_tolerance} color="bg-indigo-500" />
        </div>
      </div>
    </Card>
  );
}

// --------------- UI COMPONENTS ----------------

function InfoBlock({ label, value, icon }: any) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {icon} {label}
      </div>
      <p className="font-bold dark:text-white truncate">
        {value || "—"}
      </p>
    </div>
  );
}
function PreferenceItem({ label, value }: any) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{label}</p>
      <p className="font-bold text-sm">{value || "Any"}</p>
    </div>
  );
}

function LevelBar({ label, level, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
        <span className="text-slate-400">{label}</span>
        <span className="dark:text-white">{level || 3}/5</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${(level || 3) * 20}%` }} />
      </div>
    </div>
  );
}

// --------------- MAIN COMPONENT --------------------

export default function UserProfile({
  profile,
  listings,
  isOwner,
  onProfileUpdated,
}: {
  profile: Profile;
  listings: Listing[];
  isOwner: boolean;
  onProfileUpdated: () => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <ProfileHeader
        profile={profile}
        isOwner={isOwner}
        listingsCount={listings.length}
        onEdit={onProfileUpdated}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <AboutCard profile={profile} />
        <PreferencesCard profile={profile} />
        <LifestyleCard profile={profile} />
        {/* Хобби можно вынести отдельной карточкой ниже */}
        <Card className="md:col-span-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-6 text-center">Interests & Hobbies</p>
          <div className="flex flex-wrap justify-center gap-3">
            {(Array.isArray(profile.hobbies) ? profile.hobbies : profile.hobbies?.split(',') || []).map((h: string) => (
              <span key={h} className="px-6 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-colors cursor-default">
                {h.trim()}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}