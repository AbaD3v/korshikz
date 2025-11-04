import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Moon, Sun, Menu, X, LogOut, UserPlus, LogIn } from "lucide-react";

export default function Header({ theme, setTheme, city, setCity }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    fetchUser();

    // следим за изменением состояния авторизации
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  return (
    <header className="bg-white dark:bg-gray-900 shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Логотип */}
        <Link href="/" className="text-xl font-bold text-primary">
          Korshi.kz
        </Link>

        {/* Навигация */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/listings" className="hover:text-primary">Объявления</Link>
          <Link href="/create" className="hover:text-primary">Создать</Link>
          <Link href="/about" className="hover:text-primary">О нас</Link>

          {/* выбор города */}
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={`rounded-lg px-2 py-1 text-sm border transition-colors duration-200 
              ${theme === "light"
                ? "bg-gray-100 text-gray-900 border-gray-300 focus:bg-white"
                : "bg-gray-800 text-gray-200 border-gray-700 focus:bg-gray-700"}
            `}
          >
            <option>Алматы</option>
            <option>Астана</option>
            <option>Актобе</option>
            <option>Шымкент</option>
            <option>Караганда</option>
          </select>

          {/* Тема */}
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
            {theme === "light" ? (
              <Moon size={20} className="text-gray-700" />
            ) : (
              <Sun size={20} className="text-yellow-400" />
            )}
          </button>

          {/* Авторизация */}
          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-xl hover:bg-red-600 transition"
            >
              <LogOut size={16} />
              Выйти
            </button>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/auth/login"
                className="flex items-center gap-1 bg-primary text-white px-3 py-1 rounded-xl hover:bg-primary-dark transition"
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

        {/* Мобильное меню */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-gray-600 dark:text-gray-300"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* выпадающее меню */}
      {open && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col p-4 space-y-3">
            <Link href="/listings" onClick={() => setOpen(false)}>Объявления</Link>
            <Link href="/create" onClick={() => setOpen(false)}>Создать</Link>
            <Link href="/about" onClick={() => setOpen(false)}>О нас</Link>
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-xl hover:bg-red-600 transition"
              >
                <LogOut size={16} /> Выйти
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
