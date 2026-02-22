"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import AvatarUploader from "../components/AvatarUploader";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";

import {
  MapPin,
  User,
  Info,
  Calendar,
  GraduationCap,
  Zap,
  Moon,
  Sun,
  Coffee,
  Check,
  ShieldCheck,
  Bell,
} from "lucide-react";

// ---------------- HELPERS ----------------
const money = (n?: number | null) => (n == null ? "—" : `${n.toLocaleString()} ₸`);

function Card({ children, className = "" }: any) {
  return (
    <div
      className={`bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-slate-100 dark:border-slate-800/50 p-8 shadow-sm transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
}

// ---------------- TYPES ----------------
export type Profile = {
  id: string;

  // verification
  is_verified?: boolean | null;
  verification_status?: string | null; // 'pending' | 'approved' | 'rejected' | null

  // basics
  full_name?: string | null;
  avatar_url?: string | null;
  about_me?: string | null;
  bio?: string | null;
  birthday?: string | null;
  birth_date?: string | null;
  age?: number | null;

  // study
  university?: string | null;
  faculty?: string | null;
  course?: number | null;
  study_type?: string | null;

  // location / preferences
  city?: string | null;
  status?: string | null; // 'searching' etc

  budget?: number | null; // если у тебя реально есть одно поле budget
  budget_min?: number | null;
  budget_max?: number | null;

  preferred_gender?: string | null;
  preferred_age_min?: number | null;
  preferred_age_max?: number | null;
  preferred_pets?: boolean | null;
  preferred_smoking?: boolean | null;

  // lifestyle
  schedule_type?: string | null;
  wake_time?: string | null;
  sleep_time?: string | null;
  noise_tolerance?: number | null;
  cleanliness_level?: number | null;

  // habits
  hobbies?: string | null | string[];

  // contacts
  email?: string | null;
  phone?: string | null;

  is_student?: boolean | null;
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

// ---------------- NOTIFICATIONS (Profile) ----------------

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

function SystemNotificationsCard({ userId }: { userId: string }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,type,title,body,link,is_read,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.log("[profile notifications] load error:", error.message);
        return;
      }
      setItems((data as any) ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    // оптимистично
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));

    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (error) console.log("[profile notifications] markRead error:", error.message);
  }

  useEffect(() => {
    load();

    // realtime: новые уведомления пользователя (INSERT)
    const channel = supabase
      .channel("profile-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <Card className="md:col-span-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-1">
            System
          </p>
          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <Bell size={20} className="text-indigo-500" /> Уведомления
          </h3>
        </div>
        <button
          onClick={load}
          className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-500 transition-colors"
          disabled={loading}
        >
          {loading ? "..." : "Обновить"}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Пока нет системных сообщений.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-4 transition-colors
                border-slate-100 dark:border-slate-800
                ${n.is_read ? "bg-slate-50 dark:bg-slate-800/30" : "bg-indigo-50/60 dark:bg-indigo-950/20"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {n.title}
                  </div>
                  {n.body && (
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                      {n.body}
                    </div>
                  )}
                  <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Прочитано
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// --------------- SUBCOMPONENTS ----------------

function ProfileHeader({ profile, isOwner }: any) {
  const isVerified = profile.is_verified === true;

  return (
    <Card className="relative overflow-hidden !p-10 border-indigo-500/10 dark:border-indigo-500/20 bg-white dark:bg-slate-900">
      <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 blur-[100px] rounded-full" />

      <div className="flex flex-col md:flex-row gap-10 items-center md:items-start relative z-10">
        {/* --- AVATAR --- */}
        <div className="relative group/avatar">
          <div className="w-40 h-40 rounded-[3.5rem] overflow-hidden bg-slate-100 dark:bg-slate-800 ring-4 ring-white dark:ring-[#020617] shadow-2xl transition-transform group-hover/avatar:scale-105 duration-500">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name ?? "avatar"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                <User size={64} strokeWidth={1.5} />
              </div>
            )}

            {isOwner && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <AvatarUploader userId={profile.id} initialUrl={profile.avatar_url} />
              </div>
            )}
          </div>

          {/* VERIFIED ICON + TOOLTIP */}
          {isVerified && (
            <>
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                className="absolute -bottom-2 -right-2 bg-indigo-500 text-white p-3 rounded-2xl shadow-xl shadow-indigo-500/40 border-4 border-white dark:border-slate-900 z-20 cursor-help"
              >
                <ShieldCheck size={20} fill="currentColor" />
              </motion.div>

              <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 pointer-events-none z-30">
                <div className="bg-slate-900 dark:bg-indigo-600 text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl shadow-2xl whitespace-nowrap border border-white/10">
                  Подтвержденный студент РК
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900 dark:border-t-indigo-600" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* --- INFO --- */}
        <div className="flex-1 text-center md:text-left space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
              <span className="px-4 py-1.5 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-indigo-500/20">
                {profile.university ? "Студент" : "Пользователь"}
              </span>

              {isVerified && (
                <div className="relative group/badge">
                  <span className="px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-help">
                    <Check size={12} strokeWidth={4} /> Верифицирован
                  </span>

                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover/badge:opacity-100 transition-all duration-300 pointer-events-none z-30">
                    <div className="bg-slate-900 dark:bg-emerald-600 text-white text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                      Личность подтверждена по документу
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-emerald-600" />
                    </div>
                  </div>
                </div>
              )}

              <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-slate-200/50 dark:border-slate-700/50">
                {profile.status === "searching" ? "Активный поиск" : "Смотрит варианты"}
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-[0.85]">
              {profile.full_name || "Anonymous User"}
            </h1>
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                Location
              </span>
              <span className="text-sm font-bold text-slate-700 dark:text-white flex items-center gap-2">
                <MapPin size={16} className="text-indigo-500" />{" "}
                {profile.city || "Казахстан"}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                University
              </span>
              <span className="text-sm font-bold text-slate-700 dark:text-white flex items-center gap-2">
                <GraduationCap size={16} className="text-indigo-500" />{" "}
                {profile.university || "Не указан"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AboutCard({ profile }: any) {
  const dateValue = profile?.birthday || profile?.birth_date;

  let displayDate = "—";
  if (dateValue) {
    try {
      const d = new Date(dateValue);
      if (!isNaN(d.getTime())) {
        displayDate = d.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      } else {
        displayDate = String(dateValue).split("T")[0];
      }
    } catch (e) {
      displayDate = String(dateValue);
    }
  }

  return (
    <Card className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-1">
            Manifesto
          </p>
          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
            Обо мне
          </h3>
        </div>
        <div className="p-4 bg-indigo-500/5 rounded-3xl text-indigo-500">
          <Info size={24} />
        </div>
      </div>

      <div className="text-xl font-medium italic leading-relaxed text-slate-600 dark:text-slate-300 border-l-4 border-indigo-500 pl-6 py-2 mb-12">
        "{profile?.about_me || "Пользователь пока не заполнил свой манифест."}"
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-slate-100 dark:border-slate-800">
        <InfoBlock
          label="Возраст"
          value={profile?.age ? `${profile.age} лет` : displayDate !== "—" ? displayDate : "—"}
          icon={<Calendar size={16} className="text-indigo-500" />}
        />
        <InfoBlock
          label="Город"
          value={profile?.city || "Алматы"}
          icon={<MapPin size={16} className="text-indigo-500" />}
        />
        <InfoBlock
          label="Университет"
          value={profile?.university || "—"}
          icon={<GraduationCap size={16} className="text-indigo-500" />}
        />
      </div>
    </Card>
  );
}

function PreferencesCard({ profile }: any) {
  const budgetText = useMemo(() => {
    if (profile.budget != null) return money(profile.budget);
    if (profile.budget_min != null || profile.budget_max != null) {
      return `${money(profile.budget_min)} — ${money(profile.budget_max)}`;
    }
    return "—";
  }, [profile.budget, profile.budget_min, profile.budget_max]);

  return (
    <Card className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-6">
        Target Search
      </p>

      <div className="space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Budget
          </p>
          <p className="text-3xl text-indigo-500 font-black italic uppercase tracking-tighter">
            {budgetText}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-slate-900 dark:text-white">
          <PreferenceItem
            label="Gender"
            value={
              profile.preferred_gender === "male"
                ? "Парни"
                : profile.preferred_gender === "female"
                ? "Девушки"
                : "Любой"
            }
          />
          <PreferenceItem
            label="Age Range"
            value={`${profile.preferred_age_min || 18}-${profile.preferred_age_max || 25}`}
          />
          <PreferenceItem label="Pets OK" value={profile.preferred_pets ? "Да" : "Нет"} />
          <PreferenceItem
            label="Smoking OK"
            value={profile.preferred_smoking ? "Да" : "Нет"}
          />
        </div>
      </div>
    </Card>
  );
}

function LifestyleCard({ profile }: any) {
  const scheduleLabels: any = {
    morning: { label: "Жаворонок", icon: <Sun size={20} className="text-amber-500" /> },
    evening: { label: "Сова", icon: <Moon size={20} className="text-indigo-500" /> },
    flexible: { label: "Гибкий", icon: <Coffee size={20} className="text-slate-400" /> },
  };

  const currentSchedule = scheduleLabels[profile.schedule_type] || scheduleLabels.flexible;

  return (
    <Card>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
          <Zap size={20} />
        </div>
        <h3 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white leading-none">
          Vibe Check
        </h3>
      </div>

      <div className="space-y-8">
        <div className="flex items-center gap-3">
          {currentSchedule.icon}
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">Schedule</p>
            <p className="font-bold dark:text-white">{currentSchedule.label}</p>
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
      <p className="font-bold dark:text-white truncate">{value || "—"}</p>
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <ProfileHeader profile={profile} isOwner={isOwner} listingsCount={listings.length} onEdit={onProfileUpdated} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <AboutCard profile={profile} />
        <PreferencesCard profile={profile} />
        <LifestyleCard profile={profile} />

        {/* ✅ НОВОЕ: системные уведомления — показываем владельцу профиля */}
        {isOwner && <SystemNotificationsCard userId={profile.id} />}

        <Card className="md:col-span-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-6 text-center">
            Interests & Hobbies
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {(Array.isArray(profile.hobbies) ? profile.hobbies : profile.hobbies?.split(",") || []).map((h: string) => (
              <span
                key={h}
                className="px-6 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-colors cursor-default"
              >
                {h.trim()}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}