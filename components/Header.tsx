"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import ProfileButton from "./ProfileButton";
import {
  Moon,
  Sun,
  Menu,
  X,
  LogOut,
  UserPlus,
  LogIn,
  MessageCircle,
  Info,
  PlusCircle,
  List,
  MapPin,
  ChevronDown
} from "lucide-react";

type HeaderProps = {
  theme: "light" | "dark";
  setTheme?: (t: "light" | "dark") => void;
  city: string;
  setCity?: (c: string) => void;
};

/* ------------------ Auth Hook ------------------ */
function useAuthProfile(
  setUser: (u: any) => void,
  setProfile: (p: any) => void,
  router: any
) {
  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const authUser = data?.user || null;
        if (!mounted) return;
        setUser(authUser);

        if (authUser) {
          const { data: p } = await supabase
            .from("profiles")
            .select("id, username, avatar_url, isOnboarded")
            .eq("id", authUser.id)
            .maybeSingle();

          if (!p) {
            const { data: created } = await supabase
              .from("profiles")
              .insert([{ id: authUser.id, isOnboarded: false }])
              .select()
              .maybeSingle();
            setProfile(created);
            if (router.pathname !== "/onboarding") router.push("/onboarding");
          } else {
            setProfile(p);
            if (p.isOnboarded === false && router.pathname !== "/onboarding") {
              router.push("/onboarding");
            }
          }
        }
      } catch (err) {
        console.warn("Auth fetch error:", err);
      }
    };

    fetchUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user || null;
      setUser(authUser);
      if (!authUser) setProfile(null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);
}

/* ------------------ Final Header ------------------ */
export function Header({ theme, setTheme, city, setCity }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useAuthProfile(setUser, setProfile, router);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOpen(false);
    router.push("/");
  };

  const toggleTheme = () => setTheme?.(theme === "light" ? "dark" : "light");
  const isActive = (href: string) => router.pathname === href || router.pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 w-full max-w-full bg-white/75 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50 transition-all overflow-visible">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* 1. Logo - Добавлен shrink для мобилок */}
        <Link href="/" className="flex items-center shrink-0 group min-w-0">
          <div className="relative w-28 sm:w-32 h-9 sm:h-10 rounded-xl overflow-hidden shadow-indigo-500/20 shadow-lg group-hover:scale-105 transition-transform">
            <Image src="/logo.jpg" alt="Logo" fill className="object-cover" priority />
          </div>
        </Link>

        {/* 2. Desktop Nav */}
        <nav className="hidden md:flex items-center bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl border border-gray-200/20">
          <Link href="/listings" className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${isActive('/listings') ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
            <List size={16} /> Объявления
          </Link>
          <Link href="/about" className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${isActive('/about') ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
            <Info size={16} /> О нас
          </Link>
        </nav>

        {/* 3. Actions */}
        <div className="flex items-center gap-1 sm:gap-3 ml-auto">
          
          {/* City Select (Скрыт на маленьких мобильных) */}
          <div className="hidden lg:flex items-center gap-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full">
            <MapPin size={14} className="text-indigo-500" />
            <select
              value={city}
              onChange={(e) => setCity?.(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none cursor-pointer dark:text-gray-200 appearance-none pr-4"
            >
              <option>Алматы</option>
              <option>Астана</option>
              <option>Шымкент</option>
            </select>
            <ChevronDown size={12} className="ml-[-12px] pointer-events-none text-gray-400" />
          </div>

          <Link
            href="/create"
            className="hidden xs:flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
          >
            <PlusCircle size={18} /> <span className="hidden sm:inline">Создать</span>
          </Link>

          {/* Theme & User Group */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} className="text-yellow-400" />}
            </button>

            {user ? (
              <div className="flex items-center gap-1 sm:gap-3">
                <Link href="/chat" className="relative p-2 text-gray-500 hover:text-indigo-600">
                  <MessageCircle size={22} />
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
                </Link>
                <ProfileButton user={profile ?? { id: user?.id }} />
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Link href="/auth/login" className="text-[12px] sm:text-sm font-bold px-2 sm:px-3 py-2 text-gray-600 dark:text-gray-300">
                  Войти
                </Link>
                <Link href="/auth/register" className="hidden xs:block text-[12px] sm:text-sm font-bold px-3 sm:px-4 py-2 bg-gray-900 dark:bg-white dark:text-black text-white rounded-full hover:opacity-90">
                  Регистрация
                </Link>
              </div>
            )}
            
            {/* Mobile Menu Toggle */}
            <button onClick={() => setOpen(!open)} className="md:hidden p-1.5 text-gray-600 dark:text-gray-300">
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown - Исправлено позиционирование */}
      {open && (
        <div className="md:hidden absolute top-full left-0 right-0 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 space-y-4 shadow-xl">
          <div className="grid grid-cols-2 gap-2">
            <Link href="/listings" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 font-bold text-sm">
              <List className="text-indigo-500" /> Объявления
            </Link>
            <Link href="/create" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              <PlusCircle /> Создать
            </Link>
          </div>
          <div className="space-y-1">
             <Link href="/about" onClick={() => setOpen(false)} className="block p-3 text-center font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl">О проекте</Link>
             {!user && (
                <Link href="/auth/register" onClick={() => setOpen(false)} className="block p-3 text-center font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl">Регистрация</Link>
             )}
             {user && (
               <button onClick={handleLogout} className="w-full p-3 text-red-500 font-bold border border-red-50 dark:border-red-900/10 rounded-xl">
                 Выйти
               </button>
             )}
          </div>
        </div>
      )}
    </header>
  );
}