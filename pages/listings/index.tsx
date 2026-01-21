"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, SlidersHorizontal, X, 
  Sparkles, Loader2 
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// Компоненты
import ListingMap from "@/components/ListingMap";
import ListingCard from "@/components/ListingCard";

export default function ListingsPage() {
  const router = useRouter();
  
  const [isMounted, setIsMounted] = useState(false);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // --- ФИЛЬТРЫ ---
  const [university, setUniversity] = useState("");
  const [status, setStatus] = useState("");
  const [budget, setBudget] = useState(500000);
  const [search, setSearch] = useState("");

  // 1. Инициализация пользователя
  useEffect(() => {
    async function initPage() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("university, status")
          .eq("id", session.user.id)
          .single();
        if (profile) setCurrentUser(profile);
      }
      setIsMounted(true);
    }
    initPage();
  }, []);

// 2. Функция запроса (Переработанная под структуру Profile + Listings)
  const fetchListings = useCallback(async () => {
    if (!isMounted) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (university) params.append("university", university);
      if (status) params.append("status", status);
      if (budget) params.append("budget", budget.toString());
      if (search) params.append("search", search);

      if (currentUser?.university) params.append("myUniversity", currentUser.university);
      if (currentUser?.status) params.append("myStatus", currentUser.status);

      const response = await fetch(`/api/listings?${params.toString()}`);
      if (!response.ok) throw new Error("Ошибка сервера");
      
      const result = await response.json();
      
      // ПРЕОБРАЗОВАНИЕ: Вытаскиваем координаты из вложенных данных для карты
      const processedData = (result.data || []).map((profile) => {
        // Берем первый листинг из массива listings, который прислал бэкенд
        const geoData = profile.listings && profile.listings[0];

        return {
          ...profile,
          // Карта ищет lat/lng здесь. Если их нет в профиле, берем из листинга
          lat: profile.lat || geoData?.lat || null,
          lng: profile.lng || geoData?.lng || null,
          // Для карточки: если нет цены в профиле, берем из объявления
          price: profile.price || geoData?.price || profile.budget || 0,
          // Убеждаемся, что ID пользователя доступен для переходов
          user_id: profile.id
        };
      });

      console.log("Результат после обработки:", processedData); // Проверь в консоли наличие lat/lng
      setListings(processedData);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [isMounted, university, status, budget, search, currentUser]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchListings();
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchListings]);

  if (!isMounted) return (
    <div className="h-screen flex items-center justify-center bg-white dark:bg-[#020617]">
      <Loader2 className="animate-spin text-indigo-500" size={40} />
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-[#020617]">
      
      <section className="flex-1 overflow-y-auto no-scrollbar p-6">
        <div className="max-w-5xl mx-auto">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
                <Sparkles size={12} /> 
                {currentUser?.university ? `Приоритет: ${currentUser.university}` : "Все варианты"}
              </div>
              <h1 className="text-5xl font-black italic uppercase tracking-tighter dark:text-white transition-all">
                {loading ? "Ищем..." : `${listings.length} Вариантов`}
              </h1>
            </div>

            <div className="flex gap-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={18} />
                <input 
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Имя или ВУЗ..."
                  className="pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border-none w-64 text-sm font-bold outline-none"
                />
              </div>
              <button onClick={() => setIsFilterOpen(true)} className="flex items-center gap-2 px-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest">
                <SlidersHorizontal size={18} /> Фильтры
              </button>
            </div>
          </header>

          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2, 3, 4].map(i => <div key={i} className="aspect-[4/5] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[3rem]" />)}
             </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
              {listings.map((item) => (
                <ListingCard 
                  key={item.id} 
                  listing={item} 
                  isUniMatch={item.university === currentUser?.university}
                  matchScore={item.university === currentUser?.university ? 98 : 75}
                  onClick={() => router.push(`/profile/${item.user_id}`)} 
                />
              ))}
            </motion.div>
          )}
        </div>
      </section>

      <section className="hidden lg:block w-[45%] border-l border-slate-100 dark:border-slate-800 relative">
        <ListingMap 
          listings={listings} 
          onMarkerClick={(id: any) => router.push(`/profile/${id}`)} 
        />
      </section>

      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFilterOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-[#020617] z-[101] p-10 shadow-2xl overflow-y-auto">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter dark:text-white">Фильтры</h2>
                <button onClick={() => setIsFilterOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl"><X size={24} /></button>
              </div>

              <div className="space-y-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Статус</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold dark:text-white outline-none appearance-none">
                    <option value="">Все</option>
                    <option value="searching">Ищут жилье</option>
                    <option value="have_flat">Есть квартира</option>
                  </select>
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Макс. цена</label>
                   <input type="range" min="30000" max="500000" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full accent-indigo-600" />
                   <div className="text-center font-black text-indigo-500">{budget.toLocaleString()} ₸</div>
                </div>
                <button onClick={() => setIsFilterOpen(false)} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase italic tracking-tighter shadow-xl">
                  Показать результаты
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}