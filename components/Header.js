import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import ProfileButton from "./ProfileButton";
import { Moon, Sun, Menu, X, LogOut, UserPlus, LogIn, MessageCircle } from "lucide-react";

export default function Header({ theme, setTheme, city, setCity }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      const authUser = data?.user || null;
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
    };

    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user || null;
      setUser(authUser);
      if (!authUser) setProfile(null);
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOpen(false);
  };

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  // small reusable styles for focus + accessible buttons
  const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500";

  return (
    <header
      className={`
        sticky top-0 z-50
        bg-white/70 dark:bg-gray-900/70
        backdrop-blur-sm
        border-b border-gray-200/60 dark:border-gray-700/60
        shadow-sm
      `}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3">
          <span
            className={`
              text-xl font-extrabold tracking-tight
              bg-clip-text text-transparent
              bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-white dark:to-blue-300
            `}
          >
            Korshi.kz
          </span>
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-4 flex-1">
          <div className="flex items-center gap-4">
            <Link
              href="/listings"
              className={`px-2 py-1 rounded-md transition ${focusRing} text-sm text-gray-700 dark:text-gray-200 hover:text-indigo-600`}
            >
              Объявления
            </Link>
            <Link
              href="/create"
              className={`px-2 py-1 rounded-md transition ${focusRing} text-sm text-gray-700 dark:text-gray-200 hover:text-indigo-600`}
            >
              Создать
            </Link>
            <Link
              href="/about"
              className={`px-2 py-1 rounded-md transition ${focusRing} text-sm text-gray-700 dark:text-gray-200 hover:text-indigo-600`}
            >
              О нас
            </Link>
          </div>

          {/* spacer */}
          <div className="ml-6 flex items-center gap-3">
            {/* City selector with subtle card look */}
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`
                rounded-full px-3 py-1 text-sm border
                ${theme === "light" ? "bg-white text-gray-900 border-gray-200" : "bg-gray-800 text-gray-200 border-gray-700"}
                transition ${focusRing}
              `}
              aria-label="Выбрать город"
            >
              <option>Алматы</option>
              <option>Астана</option>
              <option>Актобе</option>
              <option>Шымкент</option>
              <option>Караганда</option>
            </select>

            {/* Theme toggle — glass pill */}
            <button
              onClick={toggleTheme}
              className={`
                flex items-center gap-2 px-3 py-1 rounded-full
                ${focusRing}
                bg-white/30 dark:bg-white/5
                backdrop-blur-sm border border-white/10
                hover:scale-105 transition transform shadow-sm
              `}
              aria-label="Переключить тему"
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              <span className="text-sm hidden sm:inline">{theme === "light" ? "Тёмная" : "Светлая"}</span>
            </button>
          </div>
        </nav>

        {/* ACTIONS (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {/* Chats (glass highlight) */}
              <Link
                href="/chat"
                className={`
                  inline-flex items-center gap-2 px-3 py-1 rounded-full
                  ${focusRing}
                  bg-gradient-to-r from-white/10 to-white/5 border border-white/10
                  backdrop-blur-sm shadow-md
                  hover:scale-105 transform transition
                `}
                aria-label="Чаты"
              >
                <MessageCircle size={16} /> <span className="text-sm">Чаты</span>
                {/* example badge (if you later add unread count) */}
                {/* <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">2</span> */}
              </Link>

              <ProfileButton user={profile ?? { id: user?.id }} />

              <button
                onClick={handleLogout}
                className={`
                  flex items-center gap-2 px-3 py-1 rounded-full text-white ${focusRing}
                  bg-gradient-to-r from-red-500 to-rose-500 shadow-lg hover:opacity-95 transition
                `}
                aria-label="Выйти"
              >
                <LogOut size={16} /> <span className="text-sm hidden sm:inline">Выйти</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className={`
                  inline-flex items-center gap-2 px-3 py-1 rounded-full text-white ${focusRing}
                  bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg hover:scale-105 transform transition
                `}
                aria-label="Войти"
              >
                <LogIn size={16} /> <span className="text-sm">Войти</span>
              </Link>

              <Link
                href="/auth/register"
                className={`
                  inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${focusRing}
                  border-2 border-indigo-600 text-indigo-600 bg-white/5 hover:bg-indigo-600 hover:text-white transition
                `}
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
            <Link href="/listings" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              Объявления
            </Link>
            <Link href="/create" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              Создать
            </Link>
            <Link href="/about" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              О нас
            </Link>

            {/* City */}
            <div className="flex flex-col">
              <label className="text-sm mb-2">Город</label>
              <select
                value={city}
                onChange={(e) => { setCity(e.target.value); setOpen(false); }}
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
                <Link
                  href="/chat"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <MessageCircle size={18} /> Чаты
                </Link>

                <button
                  onClick={() => { handleLogout(); setOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  <LogOut size={18} /> Выйти
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  Войти
                </Link>
                <Link href="/auth/register" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg border border-indigo-600 text-indigo-600">
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
