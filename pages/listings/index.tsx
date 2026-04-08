"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useLocationOptions } from "@/hooks/useLocationOptions";

import ListingMap from "@/components/ListingMap";
import ListingCard from "@/components/ListingCard";

const pickRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

type CurrentUser = {
  status?: string | null;
  university_id?: string | null;
  university?: { id: string; name: string } | null;
} | null;

export default function ListingsPage() {
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const { universities } = useLocationOptions();

  const [universityId, setUniversityId] = useState("");
  const [status, setStatus] = useState("");
  const [budget, setBudget] = useState(500000);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function initPage() {

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("status, university_id, university:universities(id, name)")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setCurrentUser({
            ...(profile as any),
            university: pickRelation((profile as any).university),
          });
        }
      }

      setIsMounted(true);
    }

    initPage();
  }, []);

  const fetchListings = useCallback(async () => {
    if (!isMounted) return;

    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (universityId) params.append("university_id", universityId);
      if (status) params.append("status", status);
      if (budget) params.append("budget", budget.toString());
      if (search) params.append("search", search);
      if (currentUser?.university_id) {
        params.append("myUniversityId", currentUser.university_id);
      }

      const response = await fetch(`/api/listings?${params.toString()}`);
      if (!response.ok) throw new Error("Server error");

      const result = await response.json();

      const processedData = (result.data || []).map((profile: any) => {
        const geoData = profile.listings?.[0];

        return {
          ...profile,
          lat: profile.lat || geoData?.lat || null,
          lng: profile.lng || geoData?.lng || null,
          price: profile.price || geoData?.price || profile.budget || 0,
          user_id: profile.id,
        };
      });

      setListings(processedData);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [isMounted, universityId, status, budget, search, currentUser]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchListings();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchListings]);

  if (!isMounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-[#020617]">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-[#020617]">
      <section className="flex-1 overflow-y-auto no-scrollbar p-6">
        <div className="max-w-5xl mx-auto">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
                <Sparkles size={12} />
                {currentUser?.university?.name
                  ? `Приоритет: ${currentUser.university.name}`
                  : "Все варианты"}
              </div>
              <h1 className="text-5xl font-black italic uppercase tracking-tighter dark:text-white transition-all">
                {loading ? "Ищем..." : `${listings.length} вариантов`}
              </h1>
            </div>

            <div className="flex gap-3">
              <div className="relative group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500"
                  size={18}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Имя или ВУЗ..."
                  className="pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border-none w-64 text-sm font-bold outline-none"
                />
              </div>
              <button
                onClick={() => setIsFilterOpen(true)}
                className="flex items-center gap-2 px-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest"
              >
                <SlidersHorizontal size={18} /> Фильтры
              </button>
            </div>
          </header>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="aspect-[4/5] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[3rem]"
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20"
            >
              {listings.map((item) => (
                <ListingCard
                  key={item.id}
                  listing={item}
                  isUniMatch={item.university_id === currentUser?.university_id}
                  matchScore={item.university_id === currentUser?.university_id ? 98 : 75}
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-[#020617] z-[101] p-10 shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter dark:text-white">
                  Фильтры
                </h2>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">
                    ВУЗ
                  </label>
                  <select
                    value={universityId}
                    onChange={(e) => setUniversityId(e.target.value)}
                    className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold dark:text-white outline-none appearance-none"
                  >
                    <option value="">Все</option>
                    {universities.map((university) => (
                      <option key={university.id} value={university.id}>
                        {university.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">
                    Статус
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold dark:text-white outline-none appearance-none"
                  >
                    <option value="">Все</option>
                    <option value="searching">Ищут жилье</option>
                    <option value="have_flat">Есть квартира</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">
                    Макс. цена
                  </label>
                  <input
                    type="range"
                    min="30000"
                    max="500000"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="text-center font-black text-indigo-500">
                    {budget.toLocaleString()} ₸
                  </div>
                </div>

                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase italic tracking-tighter shadow-xl"
                >
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

