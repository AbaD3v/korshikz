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
  MessageCircle,
  Info,
  PlusCircle,
  List,
  MapPin,
  ChevronDown,
  UserPlus
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
    <header className="sticky top-0 z-50 w-full max-w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50 transition-all overflow-visible">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
        
        {/* 1. Logo - Гибкий размер для мобилок */}
        <Link href="/" className="flex items-center shrink-0 group min-w-0">
          <div className="relative w-24 sm:w-32 h-8 sm:h-10 rounded-xl overflow-hidden shadow-indigo-500/10 shadow-lg group-hover:scale-105 transition-transform">
            <Image src="/logo.jpg" alt="Logo" fill className="object-cover" priority />
          </div>
        </Link>

        {/* 2. Desktop Nav - Скрыта на мобильных */}
        <nav className="hidden md:flex items-center bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl border border-gray-200/20">
          <Link href="/listings" className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${isActive('/listings') ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
            <List size={16} /> Объявления
          </Link>
          <Link href="/about" className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${isActive('/about') ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
            <Info size={16} /> О нас
          </Link>
        </nav>

        {/* 3. Right Side Actions */}
        <div className="flex items-center gap-1 sm:gap-4">
          
          {/* Theme Toggle - Компактный p-1.5 */}
          <button onClick={toggleTheme} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} className="text-yellow-400" />}
          </button>

          {user ? (
            /* Авторизованный пользователь */
            <div className="flex items-center gap-2">
              <Link href="/chat" className="relative p-2 text-gray-500 hover:text-indigo-600">
                <MessageCircle size={22} />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
              </Link>
              <ProfileButton user={profile ?? { id: user?.id }} />
              <button onClick={handleLogout} className="hidden lg:flex p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            /* Гость - Кнопки ВХОД и РЕГИСТРАЦИЯ РЯДОМ */
            <div className="flex items-center gap-1 sm:gap-2">
              <Link 
                href="/auth/login" 
                className="text-[12px] sm:text-sm font-bold px-2 py-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors"
              >
                Войти
              </Link>
              <Link 
                href="/auth/register" 
                className="text-[12px] sm:text-sm font-bold px-3 py-1.5 sm:py-2 bg-gray-900 dark:bg-white dark:text-black text-white rounded-full hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-gray-500/10"
              >
                Регистрация
              </Link>
            </div>
          )}
          
          {/* Кнопка Меню (3 полоски) */}
          <button 
            onClick={() => setOpen(!open)} 
            className="md:hidden ml-1 p-1 text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800 rounded-lg transition-colors"
          >
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {open && (
        <div className="md:hidden absolute top-full left-0 right-0 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 space-y-4 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-2">
            <Link href="/listings" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 font-bold text-sm">
              <List className="text-indigo-500" /> Объявления
            </Link>
            <Link href="/create" onClick={() => setOpen(false)} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              <PlusCircle /> Создать
            </Link>
          </div>
          
          <div className="space-y-1">
             <Link href="/about" onClick={() => setOpen(false)} className="flex items-center gap-3 p-3 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
               <Info size={18} className="text-gray-400" /> О проекте
             </Link>
             
             <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
               <div className="flex items-center justify-between text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                 Ваш город
               </div>
               <div className="flex items-center gap-2 text-sm font-bold">
                 <MapPin size={16} className="text-indigo-500" />
                 <select
                    value={city}
                    onChange={(e) => setCity?.(e.target.value)}
                    className="bg-transparent outline-none cursor-pointer flex-grow"
                  >
                    <option>Алматы</option>
                    <option>Астана</option>
                    <option>Шымкент</option>
                  </select>
               </div>
             </div>

             {user && (
               <button onClick={handleLogout} className="w-full mt-4 p-3 text-red-500 font-bold border border-red-50 dark:border-red-900/20 rounded-xl">
                 Выйти из аккаунта
               </button>
             )}
          </div>
        </div>
      )}
    </header>
  );
}