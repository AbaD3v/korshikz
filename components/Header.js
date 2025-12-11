// components/HeaderVariants.jsx
import Link from "next/link";
import { useState, useEffect } from "react";
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
  List
} from "lucide-react";

/**
 * Improved Header (modern/default emphasis)
 *
 * - Акцент на трех кнопках: Объявления, Создать, О нас
 * - "Создать" — акцентная кнопка (градент/пилл)
 * - "Объявления" и "О нас" — аккуратные дефолтные кнопки (подсветка при hover/active)
 * - Сохранена логика supabase / profile / роутер
 * - Клавиатурная доступность (focus-visible)
 *
 * Usage:
 * import Header from "./components/HeaderVariants";
 * <Header theme={theme} setTheme={setTheme} city={city} setCity={setCity} />
 */

function useAuthProfile(setUser, setProfile, router) {
  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
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
      } catch (e) {}
    };
  }, [router, setUser, setProfile]);
}

export function Header({ theme, setTheme, city, setCity }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const router = useRouter();

  useAuthProfile(setUser, setProfile, router);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOpen(false);
  };

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500";

  const nav = [
    { label: "Объявления", href: "/listings", kind: "default", Icon: List },
    { label: "Создать", href: "/create", kind: "primary", Icon: PlusCircle },
    { label: "О нас", href: "/about", kind: "default", Icon: Info },
  ];

  const isActive = (href) => {
    // точное совпадение или начало (для вложенных роутов)
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

        {/* NAV */}
        <nav className="hidden md:flex items-center gap-4 flex-1 justify-center">
          <div className="flex items-center gap-3">
            {nav.map((item) => {
              const active = isActive(item.href);
              // kind: primary = create, default = normal
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

              // default / neutral button
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

        {/* RIGHT ACTIONS */}
        <div className="hidden md:flex items-center gap-3">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
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
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            <span className="text-sm hidden sm:inline">{theme === "light" ? "Тёмная" : "Светлая"}</span>
          </button>

          {user ? (
            <>
              <Link
                href="/chat"
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${focusRing} bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-white/10 shadow-sm hover:scale-105 transition`}
              >
                <MessageCircle size={16} /> <span className="text-sm">Чаты</span>
              </Link>

              <ProfileButton user={profile ?? { id: user?.id }} />

              <button
                onClick={handleLogout}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-white ${focusRing} bg-gradient-to-r from-red-500 to-rose-500 shadow-lg hover:opacity-95 transition`}
              >
                <LogOut size={16} /> <span className="text-sm hidden sm:inline">Выйти</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-white ${focusRing} bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg hover:scale-105 transform transition`}
              >
                <LogIn size={16} /> <span className="text-sm">Войти</span>
              </Link>

              <Link
                href="/auth/register"
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${focusRing} border-2 border-indigo-600 text-indigo-600 bg-white/5 hover:bg-indigo-600 hover:text-white transition`}
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
export default Header;
