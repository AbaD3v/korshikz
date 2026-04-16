"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X, Sparkles, Loader2, MapPin } from "lucide-react";
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

// Районы — те же что на главной, вынести в shared/constants если хочешь
const CITY_DISTRICTS: Record<string, { value: string; label: string }[]> = {
  "Алматы": [
    { value: "", label: "Любой район" },
    { value: "bostandyk", label: "Бостандыкский" },
    { value: "medeu", label: "Медеуский" },
    { value: "alatau", label: "Алатауский" },
    { value: "almaly", label: "Алмалинский" },
    { value: "auezov", label: "Ауэзовский" },
    { value: "zhetisu", label: "Жетісуский" },
    { value: "nauryz", label: "Наурызбайский" },
    { value: "turksib", label: "Түрксіб" },
  ],
  "Астана": [
    { value: "", label: "Любой район" },
    { value: "esil", label: "Есільский" },
    { value: "almaty_astana", label: "Алматы" },
    { value: "saryarka", label: "Сарыарқа" },
    { value: "baikonyr", label: "Байқоңыр" },
    { value: "nura", label: "Нұра" },
  ],
  "Шымкент": [
    { value: "", label: "Любой район" },
    { value: "abay_shym", label: "Абай" },
    { value: "al_farabi", label: "Аль-Фараби" },
    { value: "enbekshi", label: "Еңбекші" },
    { value: "karatau", label: "Қаратау" },
  ],
  "Караганда": [
    { value: "", label: "Любой район" },
    { value: "kazybek", label: "Қазыбек би" },
    { value: "oktyabr", label: "Октябрь" },
  ],
};

export default function ListingsPage() {
  const router = useRouter();
  // Читаем параметры из URL — city, district, search
  const searchParams = useSearchParams();

  const [isMounted, setIsMounted] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const { universities } = useLocationOptions();

  // Фильтры — инициализируем из URL сразу
  const [cityFilter, setCityFilter] = useState(() => searchParams.get("city") || "");
  const [districtFilter, setDistrictFilter] = useState(() => searchParams.get("district") || "");
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [universityId, setUniversityId] = useState("");
  const [status, setStatus] = useState("");
  const [budget, setBudget] = useState(500000);

  // При изменении URL-параметров (например, переход с главной) — подхватываем их
  useEffect(() => {
    const urlCity = searchParams.get("city");
    const urlDistrict = searchParams.get("district");
    const urlSearch = searchParams.get("search");

    if (urlCity !== null) setCityFilter(urlCity);
    if (urlDistrict !== null) setDistrictFilter(urlDistrict);
    if (urlSearch !== null) setSearch(urlSearch);
  }, [searchParams]);

  useEffect(() => {
    async function initPage() {
      const { data: { session } } = await supabase.auth.getSession();

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

      // Передаём город и район в API
      if (cityFilter) params.append("city", cityFilter);
      if (districtFilter) params.append("district", districtFilter);
      if (universityId) params.append("university_id", universityId);
      if (status) params.append("status", status);
      if (budget < 500000) params.append("budget", budget.toString());
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
  }, [isMounted, cityFilter, districtFilter, universityId, status, budget, search, currentUser]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 350);

    return () => clearTimeout(timer);
  }, [fetchListings]);

  // Синхронизируем URL при изменении фильтров
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (cityFilter) params.set("city", cityFilter);
    if (districtFilter) params.set("district", districtFilter);
    if (search) params.set("search", search);
    router.replace(`/listings?${params.toString()}`, { scroll: false });
  }, [cityFilter, districtFilter, search, router]);

  useEffect(() => {
    if (!isMounted) return;
    updateUrl();
  }, [cityFilter, districtFilter, search, isMounted, updateUrl]);

  const districts = CITY_DISTRICTS[cityFilter] ?? [];

  // Человекочитаемое название района
  const districtLabel = districts.find((d) => d.value === districtFilter)?.label;

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
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
                <Sparkles size={12} />
                {currentUser?.university?.name
                  ? `Приоритет: ${currentUser.university.name}`
                  : "Все варианты"}
              </div>
              <h1 className="text-5xl font-black italic uppercase tracking-tighter dark:text-white">
                {loading ? "Ищем..." : `${listings.length} ${getCountLabel(listings.length)}`}
              </h1>

              {/* Активные фильтры из URL */}
              {(cityFilter || districtLabel || search) && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {cityFilter && (
                    <FilterTag
                      label={cityFilter}
                      onRemove={() => { setCityFilter(""); setDistrictFilter(""); }}
                    />
                  )}
                  {districtLabel && districtLabel !== "Любой район" && (
                    <FilterTag label={districtLabel} onRemove={() => setDistrictFilter("")} />
                  )}
                  {search && (
                    <FilterTag label={`"${search}"`} onRemove={() => setSearch("")} />
                  )}
                </div>
              )}
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
                  className="pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border-none w-56 text-sm font-bold outline-none dark:text-white dark:placeholder:text-slate-500"
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
          ) : listings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="text-6xl mb-6">🏠</div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white mb-3">
                Никого не нашли
              </h2>
              <p className="text-slate-400 font-medium mb-8 max-w-sm">
                Попробуй изменить фильтры или выбрать другой район
              </p>
              <button
                onClick={() => {
                  setCityFilter("");
                  setDistrictFilter("");
                  setSearch("");
                  setUniversityId("");
                  setStatus("");
                  setBudget(500000);
                }}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-colors"
              >
                Сбросить всё
              </button>
            </motion.div>
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

      {/* ФИЛЬТРЫ (сайдбар) */}
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
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-[#020617] z-[101] p-8 shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter dark:text-white">
                  Фильтры
                </h2>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X size={22} className="dark:text-white" />
                </button>
              </div>

              <div className="space-y-8">

                {/* Город */}
                <FilterSection label="Город">
                  <select
                    value={cityFilter}
                    onChange={(e) => { setCityFilter(e.target.value); setDistrictFilter(""); }}
                    className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold dark:text-white outline-none appearance-none"
                  >
                    <option value="">Все города</option>
                    {Object.keys(CITY_DISTRICTS).map((c) => (
                      <option key={c} value={c} className="dark:bg-slate-900">{c}</option>
                    ))}
                  </select>
                </FilterSection>

                {/* Район — показываем только если выбран город */}
                {cityFilter && CITY_DISTRICTS[cityFilter] && (
                  <FilterSection label="Район">
                    <select
                      value={districtFilter}
                      onChange={(e) => setDistrictFilter(e.target.value)}
                      className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold dark:text-white outline-none appearance-none"
                    >
                      {CITY_DISTRICTS[cityFilter].map((d) => (
                        <option key={d.value} value={d.value} className="dark:bg-slate-900">
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </FilterSection>
                )}

                {/* ВУЗ */}
                <FilterSection label="ВУЗ">
                  <select
                    value={universityId}
                    onChange={(e) => setUniversityId(e.target.value)}
                    className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold dark:text-white outline-none appearance-none"
                  >
                    <option value="">Все</option>
                    {universities.map((u) => (
                      <option key={u.id} value={u.id} className="dark:bg-slate-900">{u.name}</option>
                    ))}
                  </select>
                </FilterSection>

                {/* Статус */}
                <FilterSection label="Статус">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "", label: "Все" },
                      { value: "searching", label: "Ищут жильё" },
                      { value: "have_flat", label: "Есть квартира" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setStatus(opt.value)}
                        className={`py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                          status === opt.value
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        } ${opt.value === "" ? "col-span-2" : ""}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </FilterSection>

                {/* Бюджет */}
                <FilterSection label={`Макс. бюджет — ${budget.toLocaleString()} ₸`}>
                  <input
                    type="range"
                    min="30000"
                    max="500000"
                    step="10000"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 font-bold mt-1">
                    <span>30 000 ₸</span>
                    <span>500 000 ₸</span>
                  </div>
                </FilterSection>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setCityFilter("");
                      setDistrictFilter("");
                      setUniversityId("");
                      setStatus("");
                      setBudget(500000);
                      setSearch("");
                    }}
                    className="flex-1 py-4 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-[2rem] font-black uppercase italic text-xs tracking-tighter hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Сбросить
                  </button>
                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-[2rem] font-black uppercase italic tracking-tighter shadow-xl hover:bg-indigo-700 transition-colors"
                  >
                    Показать результаты
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Вспомогательные компоненты
function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic block">
        {label}
      </label>
      {children}
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black">
      <MapPin size={10} />
      {label}
      <button onClick={onRemove} className="hover:text-indigo-800 transition-colors ml-0.5">
        <X size={11} />
      </button>
    </span>
  );
}

function getCountLabel(n: number) {
  if (n % 100 >= 11 && n % 100 <= 19) return "вариантов";
  switch (n % 10) {
    case 1: return "вариант";
    case 2:
    case 3:
    case 4: return "варианта";
    default: return "вариантов";
  }
}
