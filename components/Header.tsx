"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";

type HeaderProps = {
  theme: "light" | "dark";
  setTheme?: (t: "light" | "dark") => void;
  city: string;
  setCity?: (c: string) => void;
};

/* ------------------ auth/profile hook ------------------ */
function useAuthProfile(
  setUser: (u: any) => void,
  setProfile: (p: any) => void,
  router: ReturnType<typeof useRouter>
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
        } else {
          setProfile(null);
        }
      } catch (err) {
        // ignore fetch errors in SSR/build time contexts
        console.warn("useAuthProfile fetch error:", err);
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
      try {
        listener.subscription.unsubscribe();
      } catch (e) {
        // no-op
      }
    };
  }, [router, setUser, setProfile]);
}

/* ------------------ Header (default) ------------------ */
export function Header({ theme, setTheme, city, setCity }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useAuthProfile(setUser, setProfile, router);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Logout error", e);
    }
    setUser(null);
    setOpen(false);
    // optionally redirect to home
    // router.push("/");
  };

  const toggleTheme = () => setTheme && setTheme(theme === "light" ? "dark" : "light");

  const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500";

  const nav = [
    { label: "Объявления", href: "/listings", kind: "default", Icon: List },
    { label: "Создать", href: "/create", kind: "primary", Icon: PlusCircle },
    { label: "О нас", href: "/about", kind: "default", Icon: Info },
  ];

  const isActive = (href: string) => {
    return router.pathname === href || router.pathname.startsWith(href + "/");
  };

  return (
    <header
      className={`
        sticky top-0 z-50
        bg-white/70 dark:bg-gray-900/70
        backdrop-blur-sm
        border-b border-gray-200/60 dark:border-gray-700/60
        shadow-sm
      `}
      role="banner"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3" aria-label="Korshi.kz — главная">
          <Image
            src="/logo.jpg"
            alt="Korshi.kz logo"
            width={135}
            height={135}
            className="rounded-xl select-none"
            priority
          />
          <span
            className={`
              text-xl font-extrabold tracking-tight
              bg-clip-text text-transparent
              bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-white dark:to-blue-300
            `}
          >
          </span>
        </Link>

        {/* NAV (desktop) */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-4 flex-1 justify-center">
          <div className="flex items-center gap-3">
            {nav.map((item) => {
              const active = isActive(item.href);
              if (item.kind === "primary") {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                      shadow-sm transform transition
                      ${focusRing}
                      ${active ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white scale-100" : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:scale-105"}
                    `}
                    aria-current={active ? "page" : undefined}
                  >
                    <item.Icon size={16} />
                    {item.label}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
                    transition ${focusRing}
                    ${active
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-800"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"}
                  `}
                  aria-current={active ? "page" : undefined}
                >
                  <item.Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* RIGHT ACTIONS (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <select
            value={city}
            onChange={(e) => setCity && setCity(e.target.value)}
            className={`rounded-full px-3 py-1 text-sm border ${theme === "light" ? "bg-white text-gray-900 border-gray-200" : "bg-gray-800 text-gray-200 border-gray-700"} transition ${focusRing}`}
            aria-label="Выбрать город"
          >
            <option>Алматы</option>
            <option>Астана</option>
            <option>Актобе</option>
            <option>Шымкент</option>
            <option>Караганда</option>
          </select>

          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-3 py-1 rounded-full ${focusRing} bg-white/20 dark:bg-white/5 backdrop-blur-sm border border-white/5 hover:scale-105 transition`}
            aria-label="Переключить тему"
            title={theme === "light" ? "Включить тёмную тему" : "Включить светлую тему"}
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            <span className="text-sm hidden sm:inline">{theme === "light" ? "Тёмная" : "Светлая"}</span>
          </button>

          {user ? (
            <>
              <Link
                href="/chat"
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${focusRing} bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-white/10 shadow-sm hover:scale-105 transition`}
                aria-label="Чаты"
              >
                <MessageCircle size={16} /> <span className="text-sm">Чаты</span>
              </Link>

              <ProfileButton user={profile ?? { id: user?.id }} />

              <button
                onClick={handleLogout}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-white ${focusRing} bg-gradient-to-r from-red-500 to-rose-500 shadow-lg hover:opacity-95 transition`}
                aria-label="Выйти"
                title="Выйти"
              >
                <LogOut size={16} /> <span className="text-sm hidden sm:inline">Выйти</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-white ${focusRing} bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg hover:scale-105 transform transition`}
                aria-label="Войти"
              >
                <LogIn size={16} /> <span className="text-sm">Войти</span>
              </Link>

              <Link
                href="/auth/register"
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${focusRing} border-2 border-indigo-600 text-indigo-600 bg-white/5 hover:bg-indigo-600 hover:text-white transition`}
                aria-label="Регистрация"
              >
                <UserPlus size={16} /> <span>Регистрация</span>
              </Link>
            </>
          )}
        </div>

        {/* MOBILE TOGGLE */}
        <button
          onClick={() => setOpen(!open)}
          className={`md:hidden p-2 rounded-lg ${focusRing} hover:bg-white/20 dark:hover:bg-white/5 transition`}
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {open && (
        <div className="md:hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200/60 dark:border-gray-700/60 animate-fadeIn">
          <div className="flex flex-col p-4 space-y-3">
            <Link href="/listings" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">Объявления</Link>
            <Link href="/create" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">Создать</Link>
            <Link href="/about" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">О нас</Link>

            <div className="flex flex-col">
              <label className="text-sm mb-2">Город</label>
              <select
                value={city}
                onChange={(e) => { setCity && setCity(e.target.value); setOpen(false); }}
                className="rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <option>Алматы</option>
                <option>Астана</option>
                <option>Актобе</option>
                <option>Шымкент</option>
                <option>Караганда</option>
              </select>
            </div>

            <button
              onClick={() => { toggleTheme(); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              Сменить тему
            </button>

            {user ? (
              <>
                <Link href="/chat" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <MessageCircle size={18} /> Чаты
                </Link>

                <button onClick={() => { handleLogout(); setOpen(false); }} className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                  <LogOut size={18} /> Выйти
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white">Войти</Link>
                <Link href="/auth/register" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg border border-indigo-600 text-indigo-600">Регистрация</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/* ------------------ HeaderVisionPro (iOS Vision Pro style) ------------------ */
export function HeaderVisionPro({ theme, setTheme, city, setCity }: HeaderProps) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useAuthProfile(setUser, setProfile, router);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Logout error", e);
    }
    setUser(null);
  };

  const toggleTheme = () => setTheme && setTheme(theme === "light" ? "dark" : "light");

  const nav = [
    { label: "Объявления", href: "/listings", Icon: List },
    { label: "Создать", href: "/create", Icon: PlusCircle, accent: true },
    { label: "О нас", href: "/about", Icon: Info },
  ];

  const isActive = (href: string) => router.pathname === href || router.pathname.startsWith(href + "/");

  return (
    <>
      <div className="fixed left-1/2 -translate-x-1/2 top-6 z-60">
        <div
          className={`
            flex items-center gap-4 px-4 py-3 rounded-2xl
            bg-white/30 dark:bg-black/30
            backdrop-blur-md
            border border-white/10 dark:border-white/5
            shadow-2xl
            min-w-[680px] max-w-[90vw]
          `}
        >
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-inner">
              K
            </div>
            <div className="hidden md:block">
              <div className="text-lg font-semibold text-white/90">Korshi.kz</div>
              <div className="text-xs text-white/60">жильё и соседи</div>
            </div>
          </Link>

          <div className="flex-1 flex items-center justify-center gap-3">
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium
                    transition transform
                    ${active ? "scale-105 ring-2 ring-white/20" : "hover:scale-102"}
                    ${item.accent ? "bg-gradient-to-r from-cyan-400 to-blue-600 text-black/90" : "bg-white/6 text-white/90"}
                  `}
                  aria-current={active ? "page" : undefined}
                >
                  <item.Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={city}
              onChange={(e) => setCity && setCity(e.target.value)}
              className="rounded-full px-3 py-1 text-sm border border-white/10 bg-white/5 text-white/90"
            >
              <option>Алматы</option>
              <option>Астана</option>
              <option>Актобе</option>
              <option>Шымкент</option>
              <option>Караганда</option>
            </select>

            <button onClick={toggleTheme} className="p-2 rounded-lg bg-white/5 text-white/90">
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {user ? (
              <>
                <Link href="/chat" className="p-2 rounded-lg bg-white/6 text-white/90">
                  <MessageCircle size={16} />
                </Link>
                <ProfileButton user={profile ?? { id: user?.id }} />
                <button onClick={handleLogout} className="px-3 py-1 rounded-full bg-red-500 text-white">
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="px-3 py-1 rounded-full bg-white/80 text-black">
                  Войти
                </Link>
                <Link href="/auth/register" className="px-3 py-1 rounded-full border border-white/20 text-white/90">
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* fallback for small screens */}
      <div className="md:hidden sticky top-0 z-50 bg-transparent">
        <div className="flex items-center justify-between px-3 py-2">
          <Link href="/" className="text-lg font-bold">Korshi.kz</Link>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg bg-white/5">
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
