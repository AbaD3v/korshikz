"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, SlidersHorizontal, X, 
  Sparkles, UserCheck
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// Компоненты (убедись, что пути верны)
import ListingMap from "@/components/ListingMap";
import ListingCard from "@/components/ListingCard";

export default function ListingsPage() {
  const router = useRouter();
  
  const [isMounted, setIsMounted] = useState(false);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // --- ФИЛЬТРЫ ---
  const [university, setUniversity] = useState("");
  const [status, setStatus] = useState("");
  const [budget, setBudget] = useState<number>(500000);
  const [search, setSearch] = useState("");

  // 1. Инициализация профиля
  useEffect(() => {
    if (router.isReady) {
      const initPage = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("university, status")
            .eq("id", session.user.id)
            .single();
          setCurrentUser(profile);
        }
        setIsMounted(true);
      };
      initPage();
    }
  }, [router.isReady]);

  // 2. Функция запроса (Умный мэтчинг)
  const fetchListings = useCallback(async () => {
    // Не запрашиваем, пока профиль не загружен или страница не смонтирована
    if (!isMounted) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Базовые фильтры
      if (university) params.append("university", university);
      if (status) params.append("status", status);
      if (budget) params.append("budget", budget.toString());
      if (search) params.append("search", search);

      // Параметры для веса (Sorting)
      if (currentUser?.university) params.append("myUniversity", currentUser.university);
      if (currentUser?.status) params.append("myStatus", currentUser.status);

      const response = await fetch(`/api/listings?${params.toString()}`);
      if (!response.ok) throw new Error("Ошибка сервера");
      
      const result = await response.json();
      setListings(result.data || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [isMounted, university, status, budget, search, currentUser]);

  // Триггер загрузки при изменении фильтров
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchListings();
    }, 400); // Небольшой дебаунс для поиска

    return () => clearTimeout(delayDebounceFn);
  }, [fetchListings]);

  if (!isMounted) return null;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-[#020617]">
      
      {/* ЛЕВАЯ ПАНЕЛЬ: СПИСОК */}
      <section className="flex-1 overflow-y-auto no-scrollbar scroll-smooth p-6">
        <div className="max-w-5xl mx-auto">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
                <Sparkles size={12} /> 
                {currentUser?.university ? `Приоритет: ${currentUser.university}` : "Все мэтчи"}
              </div>
              <h1 className="text-5xl font-black italic uppercase tracking-tighter dark:text-white transition-all">
                {loading ? "Ищем..." : `${listings.length} Вариантов`}
              </h1>
            </div>

            <div className="flex gap-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Имя или ВУЗ..."
                  className="pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border-none w-64 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                />
              </div>
              <button 
                onClick={() => setIsFilterOpen(true)}
                className="flex items-center gap-2 px-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-500/10"
              >
                <SlidersHorizontal size={18} /> Фильтры
              </button>
            </div>
          </header>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-[4/5] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[3rem]" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-400 font-bold italic text-lg mb-4">Мэтчей не найдено</p>
                <button onClick={() => {setSearch(""); setStatus(""); setUniversity("");}} className="text-indigo-500 font-black uppercase text-xs tracking-widest underline">Сбросить всё</button>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20"
            >
              {listings.map((item: any) => (
                <ListingCard 
                  key={item.id} 
                  listing={item} 
                  isUniMatch={item.university === currentUser?.university}
                  onClick={() => router.push(`/profile/${item.id}`)} 
                />
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ПРАВАЯ ПАНЕЛЬ: КАРТА */}
      <section className="hidden lg:block w-[45%] border-l border-slate-100 dark:border-slate-800 relative">
        <ListingMap listings={listings} />
      </section>

      {/* ФИЛЬТРЫ (Drawer) */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setIsFilterOpen(false)} 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]" 
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-[#020617] z-[101] shadow-2xl p-10 overflow-y-auto no-scrollbar"
            >
              
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter dark:text-white">Настройки поиска</h2>
                <button onClick={() => setIsFilterOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl dark:text-white transition-transform active:scale-90"><X size={24} /></button>
              </div>

              <div className="space-y-10 pb-20">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Тип сожителя</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border-none outline-none font-bold dark:text-white appearance-none cursor-pointer">
                    <option value="">Все варианты</option>
                    <option value="searching">Ищут жилье (Searching)</option>
                    <option value="have_flat">Есть квартира (Have Flat)</option>
                    <option value="free_spot">Есть комната (Free Spot)</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Университет</label>
                  <input 
                    value={university} 
                    onChange={(e) => setUniversity(e.target.value)} 
                    placeholder="Напр: AIU, ENU, KBTU" 
                    className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border-none outline-none font-bold dark:text-white" 
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Макс. бюджет</label>
                    <div className="font-black text-indigo-500 italic text-xl">{budget.toLocaleString()} ₸</div>
                  </div>
                  <input 
                    type="range" 
                    min="30000" 
                    max="500000" 
                    step="5000"
                    value={budget} 
                    onChange={(e) => setBudget(Number(e.target.value))} 
                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                  />
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-8 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex gap-4">
                <button 
                  onClick={() => setIsFilterOpen(false)} 
                  className="flex-1 py-5 bg-indigo-600 text-white rounded-[2rem] font-black italic uppercase tracking-tighter shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                >
                  Применить фильтры
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}