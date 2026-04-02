"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import ProfileButton from "./ProfileButton";
import NotificationsBell from "./NotificationsBell";
import { useUnreadChatCount } from "../hooks/useUnreadChatCount";

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
} from "lucide-react";

type HeaderProps = {
  theme: "light" | "dark";
  setTheme?: (t: "light" | "dark") => void;
  city: string;
  setCity?: (c: string) => void;
};

const CITY_OPTIONS = ["Алматы", "Астана", "Шымкент", "Караганда"];

function useAuthProfile(
  setUser: (u: any) => void,
  setProfile: (p: any) => void,
  router: any
) {
  useEffect(() => {
    let mounted = true;

    const authExclusionPages = [
      "/auth/update-password",
      "/auth/confirm",
      "/auth/forgot-password",
      "/auth/login",
      "/auth/register",
    ];

    const isExcluded = authExclusionPages.some((page) =>
      router.pathname.startsWith(page)
    );

    const loadProfile = async (authUser: any) => {
      if (!authUser) {
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
        return;
      }

      if (mounted) setUser(authUser);

      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, isOnboarded")
        .eq("id", authUser.id)
        .maybeSingle();

      if (profileError) {
        console.warn("Profile fetch error:", profileError);
        return;
      }

      let finalProfile = existingProfile;

      if (!existingProfile) {
        const { data: createdProfile, error: createError } = await supabase
          .from("profiles")
          .upsert([{ id: authUser.id, isOnboarded: false }], {
            onConflict: "id",
          })
          .select("id, username, avatar_url, isOnboarded")
          .maybeSingle();

        if (createError) {
          console.warn("Profile create error:", createError);
          return;
        }

        finalProfile = createdProfile;
      }

      if (mounted) {
        setProfile(finalProfile ?? null);
      }

      if (
        finalProfile?.isOnboarded === false &&
        !isExcluded &&
        router.pathname !== "/onboarding"
      ) {
        router.replace("/onboarding");
      }
    };

    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        await loadProfile(data?.user || null);
      } catch (err) {
        console.warn("Auth fetch error:", err);
      }
    };

    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await loadProfile(session?.user || null);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router.pathname, router, setProfile, setUser]);
}

export function Header({ theme, setTheme, city, setCity }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();
  const { unreadChatCount } = useUnreadChatCount();

  useAuthProfile(setUser, setProfile, router);

  useEffect(() => {
    if (!router.isReady) return;

    const cityFromUrl = router.query.city as string;
    if (cityFromUrl && cityFromUrl.toLowerCase() !== city.toLowerCase()) {
      setCity?.(cityFromUrl);
    }
  }, [router.isReady, router.query.city, city, setCity]);

  useEffect(() => {
    setOpen(false);
  }, [router.asPath]);

  const handleCityChange = useCallback(
    (newCity: string) => {
      setCity?.(newCity);

      if (router.pathname.startsWith("/listings")) {
        router.push(
          {
            pathname: router.pathname,
            query: { ...router.query, city: newCity },
          },
          undefined,
          { shallow: false }
        );
      }
    },
    [router, setCity]
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setProfile(null);
      setOpen(false);
      router.push("/");
    }
  };

  const toggleTheme = () => setTheme?.(theme === "light" ? "dark" : "light");

  const isActive = (href: string) =>
    router.pathname === href || router.pathname.startsWith(href + "/");

  const logoSrc = theme === "dark" ? "/logo2.png" : "/logo.png";

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50 transition-all">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-8 shrink-0">
          <Link href="/" className="group">
            <div className="relative w-24 sm:w-32 h-8 sm:h-10 rounded-xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
              <Image
                src={logoSrc}
                alt="Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl border border-gray-200/20">
            <MapPin size={14} className="text-indigo-500" />
            <select
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer dark:text-gray-200"
            >
<<<<<<< HEAD
              <option value="Алматы" className="dark:bg-gray-900">Алматы</option>
              <option value="Астана" className="dark:bg-gray-900">Астана</option>
              <option value="Шымкент" className="dark:bg-gray-900">Шымкент</option>
              <option value="Караганда" className="dark:bg-gray-900">Караганда</option>
=======
              {CITY_OPTIONS.map((item) => (
                <option key={item} value={item} className="dark:bg-gray-900">
                  {item}
                </option>
              ))}
>>>>>>> fbd0f7846611f94ed7697e8f537f8a6c5febf6ab
            </select>
          </div>
        </div>

        <nav className="hidden md:flex items-center bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl border border-gray-200/20">
          <Link
            href="/listings"
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
              isActive("/listings")
                ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <List size={16} /> Люди
          </Link>

          <Link
            href="/about"
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
              isActive("/about")
                ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Info size={16} /> О проекте
          </Link>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          {user && (
            <Link
              href="/create"
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black transition-all shadow-lg shadow-indigo-500/20 active:scale-95 uppercase tracking-widest mr-2"
            >
              <PlusCircle size={16} /> Моё жильё
            </Link>
          )}

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon size={20} />
            ) : (
              <Sun size={20} className="text-yellow-400" />
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <NotificationsBell />

              <Link
                href="/chat"
                className="relative p-2 text-gray-500 hover:text-indigo-600 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Chat"
              >
                <MessageCircle size={22} />
                {unreadChatCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-gray-900">
                    {unreadChatCount > 99 ? "99+" : unreadChatCount}
                  </span>
                )}
              </Link>

              <ProfileButton user={profile ?? { id: user?.id }} />

              <button
                onClick={handleLogout}
                className="hidden lg:flex p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                aria-label="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/auth/login"
                className="text-xs font-bold px-2 py-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors"
              >
                Войти
              </Link>

              <Link
                href="/auth/register"
                className="text-xs font-black px-4 py-2 bg-gray-900 dark:bg-white dark:text-black text-white rounded-full hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-gray-500/10 uppercase tracking-tighter"
              >
                Регистрация
              </Link>
            </div>
          )}

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-1 text-gray-600 dark:text-gray-300 rounded-lg active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
            aria-label="Menu"
          >
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 space-y-4 shadow-2xl animate-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/listings"
              onClick={() => setOpen(false)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 font-bold text-sm"
            >
              <List className="text-indigo-500" /> Люди
            </Link>

            {user ? (
              <Link
                href="/create"
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold text-sm"
              >
                <PlusCircle /> Жильё
              </Link>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold text-sm"
              >
                <PlusCircle /> Войти
              </Link>
            )}
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
              Ваш город
            </div>
            <div className="flex items-center gap-3 font-bold">
              <MapPin size={18} className="text-indigo-500" />
              <select
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                className="bg-transparent flex-1 outline-none dark:text-white"
              >
                {CITY_OPTIONS.map((item) => (
                  <option key={item} value={item} className="dark:bg-gray-900">
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 p-3 font-medium dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <Info size={18} className="text-gray-400" /> О проекте
            </Link>

            {user && (
              <button
                onClick={handleLogout}
                className="w-full mt-2 p-4 text-red-500 font-black text-xs uppercase tracking-widest border border-red-50 dark:border-red-900/10 rounded-2xl active:bg-red-50 transition-colors"
              >
                Выйти из аккаунта
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}