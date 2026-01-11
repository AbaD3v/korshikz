"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, SlidersHorizontal, X, MapPin, Navigation, 
  Home, Building2, Ruler, Calendar, Layers, Info 
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

import ListingMap from "@/components/ListingMap";
import ListingCard from "@/components/ListingCard";

export default function ListingsPage({ city }: { city: string }) {
  const router = useRouter();
  
  const [isMounted, setIsMounted] = useState(false);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // --- ПОЛНЫЙ НАБОР ФИЛЬТРОВ (СИНХРОНИЗИРОВАНО С БАЗОЙ) ---
  const [search, setSearch] = useState("");
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(5000000);
  const [rooms, setRooms] = useState<number[]>([]);
  const [rentType, setRentType] = useState<string>(""); 
  const [propertyType, setPropertyType] = useState<string>(""); 
  const [district, setDistrict] = useState("");
  const [areaMin, setAreaMin] = useState("");
  const [areaMax, setAreaMax] = useState(""); // Добавлено
  const [floor, setFloor] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");

  useEffect(() => { setIsMounted(true); }, []);

  const fetchListings = useCallback(async () => {
    if (!isMounted) return;
    setLoading(true);
    try {
      let query = supabase
        .from("listings")
        .select(`*`)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      // 1. Город и Поиск
      if (city) query = query.ilike("city", `%${city}%`);
      if (search) query = query.ilike("title", `%${search}%`);
      
      // 2. Цена (numeric)
      query = query.gte("price", priceMin || 0).lte("price", priceMax || 999999999);

      // 3. Комнаты (integer)
      if (rooms.length > 0) query = query.in("rooms", rooms);

      // 4. Район (district)
      if (district) query = query.ilike("district", `%${district}%`);

      // 5. Типы (property_type, rent_type)
      if (propertyType) query = query.eq("property_type", propertyType);
      if (rentType) query = query.eq("rent_type", rentType);

      // 6. Площадь (area_total)
      if (areaMin) query = query.gte("area_total", Number(areaMin));
      if (areaMax) query = query.lte("area_total", Number(areaMax));

      // 7. Этаж и Год постройки
      if (floor) query = query.eq("floor", Number(floor));
      if (yearBuilt) query = query.gte("year_built", Number(yearBuilt));

      const { data, error } = await query;
      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error("Ошибка запроса:", err);
    } finally {
      setLoading(false);
    }
  }, [isMounted, city, search, priceMin, priceMax, rooms, rentType, propertyType, district, areaMin, areaMax, floor, yearBuilt]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  if (!isMounted) return null;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-[#020617]">
      
      {/* ЛЕВАЯ ПАНЕЛЬ: СПИСОК */}
      <section className="flex-1 overflow-y-auto no-scrollbar scroll-smooth p-6">
        <div className="max-w-5xl mx-auto">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
                <Navigation size={12} /> {city}
              </div>
              <h1 className="text-5xl font-black italic uppercase tracking-tighter dark:text-white">
                {loading ? "Загрузка..." : `${listings.length} Объектов`}
              </h1>
            </div>

            <div className="flex gap-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по названию..."
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
              {[1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[3rem]" />)}
            </div>
          ) : listings.length === 0 ? (
            <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
               <p className="text-slate-400 font-bold italic text-lg mb-4">Объектов не найдено</p>
<button 
  onClick={() => {
    setSearch(""); 
    setRooms([]); 
    setPriceMax(5000000); 
    // setCity здесь не нужен, так как город управляется глобально
  }} 
  className="text-indigo-500 font-black uppercase text-xs tracking-widest underline"
>
  Сбросить фильтры
</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
              {listings.map((item: any) => (
                <ListingCard key={item.id} listing={item} onClick={() => router.push(`/listings/${item.id}`)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ПРАВАЯ ПАНЕЛЬ: КАРТА */}
      <section className="hidden lg:block w-[45%] border-l border-slate-100 dark:border-slate-800 relative">
        <ListingMap listings={listings} />
      </section>

      {/* ПОЛНОЭКРАННЫЕ ФИЛЬТРЫ (DRAWER) */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFilterOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-[#020617] z-[101] shadow-2xl p-10 overflow-y-auto no-scrollbar">
              
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter dark:text-white">Параметры</h2>
                <button onClick={() => setIsFilterOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl dark:text-white"><X size={24} /></button>
              </div>

              <div className="space-y-10 pb-20">
                {/* Бюджет */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Бюджет (₸)</label>
                  <div className="flex gap-4">
                    <input type="number" placeholder="От" className="w-1/2 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border-none outline-none font-bold dark:text-white" value={priceMin || ""} onChange={(e) => setPriceMin(Number(e.target.value))} />
                    <input type="number" placeholder="До" className="w-1/2 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border-none outline-none font-bold dark:text-white" value={priceMax || ""} onChange={(e) => setPriceMax(Number(e.target.value))} />
                  </div>
                </div>

                {/* Комнаты */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Комнаты</label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setRooms(rooms.includes(n) ? rooms.filter(r => r !== n) : [...rooms, n])} className={`w-14 h-14 rounded-2xl font-black transition-all ${rooms.includes(n) ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                        {n === 5 ? "5+" : n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Тип недвижимости & Аренды */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Тип жилья</label>
                    <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border-none outline-none font-bold dark:text-white">
                      <option value="">Любой</option>
                      <option value="apartment">Квартира</option>
                      <option value="house">Дом</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Срок</label>
                    <select value={rentType} onChange={(e) => setRentType(e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border-none outline-none font-bold dark:text-white">
                      <option value="">Любой</option>
                      <option value="long">Длительно</option>
                      <option value="daily">Посуточно</option>
                    </select>
                  </div>
                </div>

                {/* Район */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Микрорайон / Район</label>
                  <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Например: Самал-2" className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border-none outline-none font-bold dark:text-white" />
                </div>

                {/* Площадь, Этаж, Год */}
                <div className="grid grid-cols-3 gap-4">
                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Площадь от</label>
                      <input type="number" value={areaMin} onChange={(e) => setAreaMin(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-none font-bold dark:text-white" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Этаж</label>
                      <input type="number" value={floor} onChange={(e) => setFloor(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-none font-bold dark:text-white" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Год от</label>
                      <input type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-none font-bold dark:text-white" />
                   </div>
                </div>
              </div>

              {/* Футер фильтра */}
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex gap-4">
                <button onClick={() => {setRooms([]); setSearch(""); setDistrict(""); setAreaMin(""); setAreaMax(""); setFloor(""); setYearBuilt(""); setPropertyType(""); setRentType(""); setPriceMin(0); setPriceMax(5000000);}} className="px-6 py-4 font-black text-xs uppercase tracking-widest text-slate-400 hover:text-black dark:hover:text-white transition-colors">Сбросить</button>
                <button onClick={() => setIsFilterOpen(false)} className="flex-1 py-5 bg-indigo-600 text-white rounded-[2rem] font-black italic uppercase tracking-tighter shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">Применить</button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}