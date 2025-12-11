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
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOpen(false);
  };

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  return (
    <header className="bg-white dark:bg-gray-900 shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">

        {/* Логотип */}
        <Link href="/" className="text-xl font-bold text-primary">
          Korshi.kz
        </Link>

        {/* Десктопная навигация */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/listings" className="hover:text-primary transition">Объявления</Link>
          <Link href="/create" className="hover:text-primary transition">Создать</Link>
          <Link href="/about" className="hover:text-primary transition">О нас</Link>

          {/* Город */}
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={`rounded-lg px-2 py-1 text-sm border transition
              ${theme === "light"
                ? "bg-gray-100 text-gray-900 border-gray-300"
                : "bg-gray-800 text-gray-200 border-gray-700"}`}
          >
            <option>Алматы</option>
            <option>Астана</option>
            <option>Актобе</option>
            <option>Шымкент</option>
            <option>Караганда</option>
          </select>

          {/* Тема */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Авторизация */}
          {user ? (
            <div className="flex items-center gap-3">

              <Link
                href="/chat"
                className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-xl 
                           hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <MessageCircle size={18} />
                Чаты
              </Link>

              <ProfileButton user={profile ?? { id: user?.id }} />

              <button
                onClick={handleLogout}
                className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-xl hover:bg-red-600 transition"
              >
                <LogOut size={16} /> Выйти
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/auth/login"
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-xl hover:bg-blue-700 transition"
              >
                <LogIn size={16} /> Войти
              </Link>
              <Link
                href="/auth/register"
                className="flex items-center gap-1 border border-primary text-primary px-3 py-1 rounded-xl hover:bg-primary hover:text-white transition"
              >
                <UserPlus size={16} /> Регистрация
              </Link>
            </div>
          )}
        </nav>

        {/* Мобильное меню кнопка */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Мобильное меню */}
      {open && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 animate-fadeIn">
          <div className="flex flex-col p-4 space-y-4">

            <Link href="/listings" onClick={() => setOpen(false)}>Объявления</Link>
            <Link href="/create" onClick={() => setOpen(false)}>Создать</Link>
            <Link href="/about" onClick={() => setOpen(false)}>О нас</Link>

            {/* Город на мобиле */}
            <div className="flex flex-col">
              <label className="text-sm mb-1">Город</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
              >
                <option>Алматы</option>
                <option>Астана</option>
                <option>Актобе</option>
                <option>Шымкент</option>
                <option>Караганда</option>
              </select>
            </div>

            {/* Темная тема */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              Сменить тему
            </button>

            {user && (
              <Link
                href="/chat"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg"
              >
                <MessageCircle size={18} /> Чаты
              </Link>
            )}

            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-500 text-white px-3 py-2 rounded-lg"
              >
                <LogOut size={18} /> Выйти
              </button>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setOpen(false)}>Войти</Link>
                <Link href="/auth/register" onClick={() => setOpen(false)}>Регистрация</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
