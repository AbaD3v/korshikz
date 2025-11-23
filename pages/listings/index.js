import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { motion } from "framer-motion";
import ListingMap from "/components/ListingMap";
import ListingCard from "/components/ListingCard";

/* =============================
   Хелперы
   ============================= */
function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function formatPrice(n) {
  if (n == null) return "";
  return `${Number(n).toLocaleString("ru-RU")} ₸`;
}

/* =============================
   Основной компонент
   ============================= */
export default function Listings({ selectedCity }) {
  const router = useRouter();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 350);

  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(200000);
  const priceBoundsRef = useRef({ min: 0, max: 200000 });

  const [rooms, setRooms] = useState([]);
  const [types, setTypes] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [nearMetro, setNearMetro] = useState(false);
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [radius, setRadius] = useState("5");

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sort, setSort] = useState("newest");
  const [showMap, setShowMap] = useState(false);

  const [userCoords, setUserCoords] = useState(null);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (debouncedSearch.trim()) c++;
    if ((priceMin || priceMax) && !(priceMin === 0 && priceMax === priceBoundsRef.current.max)) c++;
    if (rooms.length) c++;
    if (types.length) c++;
    if (amenities.length) c++;
    if (nearMetro) c++;
    if (geoEnabled && radius && radius !== "5") c++;
    return c;
  }, [debouncedSearch, priceMin, priceMax, rooms, types, amenities, nearMetro, geoEnabled, radius]);

  useEffect(() => {
    const min = 0;
    const max = 300000;
    priceBoundsRef.current = { min, max };
    setPriceMin(min);
    setPriceMax(200000);
  }, []);

  useEffect(() => {
    if (!geoEnabled) {
      setUserCoords(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(pos => {
      setUserCoords([pos.coords.latitude, pos.coords.longitude]);
    });
  }, [geoEnabled]);

  const buildSupabaseQuery = async () => {
    let q = supabase.from("listings").select("*");

    if (selectedCity) q = q.eq("city", selectedCity);

    if (debouncedSearch?.trim()) {
      const like = `%${debouncedSearch.trim()}%`;
      q = q.or(`title.ilike.${like},description.ilike.${like}`);
    }

    if (priceMin != null) q = q.gte("price", priceMin);
    if (priceMax != null) q = q.lte("price", priceMax);

    if (rooms.length) q = q.in("rooms", rooms);
    if (types.length) q = q.in("property_type", types);
    if (amenities.length) q = q.contains("amenities", amenities);
    if (nearMetro) q = q.eq("near_metro", true);

    if (sort === "price-asc") q = q.order("price", { ascending: true });
    else if (sort === "price-desc") q = q.order("price", { ascending: false });
    else q = q.order("id", { ascending: false });

    q = q.limit(100);
    return q;
  };

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoading(true);
      try {
        const q = await buildSupabaseQuery();
        const { data, error } = await q;
        if (error) throw error;
        if (!mounted) return;
        setListings(data || []);
      } catch (e) {
        console.error("Ошибка загрузки:", e.message || e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => { mounted = false; };
  }, [debouncedSearch, priceMin, priceMax, rooms.join(","), types.join(","), amenities.join(","), nearMetro, geoEnabled, radius, sort, selectedCity]);

  const toggleSet = (arr, setArr, value) => {
    setArr(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]);
  };

  const resetFilters = () => {
    setSearch("");
    setPriceMin(priceBoundsRef.current.min);
    setPriceMax(priceBoundsRef.current.max);
    setRooms([]);
    setTypes([]);
    setAmenities([]);
    setNearMetro(false);
    setGeoEnabled(false);
    setRadius("5");
    setSort("newest");
    setMobileFiltersOpen(false);
  };

  const applyFiltersToUrl = () => {
    const qp = {};
    if (search.trim()) qp.q = search.trim();
    if (priceMin !== priceBoundsRef.current.min) qp.pmin = priceMin;
    if (priceMax !== priceBoundsRef.current.max) qp.pmax = priceMax;
    if (rooms.length) qp.rooms = rooms.join(",");
    if (types.length) qp.type = types.join(",");
    if (amenities.length) qp.am = amenities.join(",");
    if (nearMetro) qp.metro = "1";
    if (geoEnabled && radius && radius !== "5") qp.r = radius;
    if (sort && sort !== "newest") qp.sort = sort;
    router.replace({ pathname: router.pathname, query: { ...router.query, ...qp } }, undefined, { shallow: true });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
      {/* Заголовок + поиск + сортировка */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Объявления {selectedCity ? `в ${selectedCity}` : ""}
        </h1>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="🔍 Поиск..."
            className="w-full sm:w-72 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex gap-2 mt-2 sm:mt-0">
            <button
              onClick={() => setSort("newest")}
              className={`px-4 py-2 rounded-lg border transition ${sort==="newest"?"bg-emerald-600 text-white":"bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"}`}
            >
              Новые
            </button>
            <button
              onClick={() => setSort("price-asc")}
              className={`px-4 py-2 rounded-lg border transition ${sort==="price-asc"?"bg-emerald-600 text-white":"bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"}`}
            >
              ↑ Цена
            </button>
            <button
              onClick={() => setSort("price-desc")}
              className={`px-4 py-2 rounded-lg border transition ${sort==="price-desc"?"bg-emerald-600 text-white":"bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"}`}
            >
              ↓ Цена
            </button>
          </div>
        </div>
      </div>

      {/* Сетка: фильтры / список / карта */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_420px] gap-6">
        {/* Desktop Filters */}
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <FiltersPanel
              priceMin={priceMin} priceMax={priceMax} setPriceMin={setPriceMin} setPriceMax={setPriceMax} priceBounds={priceBoundsRef.current}
              rooms={rooms} toggleRooms={(v)=>toggleSet(rooms, setRooms, v)}
              types={types} toggleTypes={(v)=>toggleSet(types, setTypes, v)}
              amenities={amenities} toggleAmenities={(v)=>toggleSet(amenities, setAmenities, v)}
              nearMetro={nearMetro} setNearMetro={setNearMetro}
              geoEnabled={geoEnabled} setGeoEnabled={setGeoEnabled}
              radius={radius} setRadius={setRadius}
              onReset={resetFilters} onApply={applyFiltersToUrl}
            />
          </div>
        </div>

        {/* Список */}
        <main>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-2xl h-72" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {listings.map(listing => (
                <ListingCard key={listing.id} listing={listing} onClick={()=>router.push(`/listings/${listing.id}`)} />
              ))}
            </div>
          )}
        </main>

        {/* Map (desktop) */}
        <div className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl overflow-hidden shadow-xl h-[70vh]">
            <ListingMap listings={listings} userCoords={userCoords} />
          </div>
        </div>
      </div>

      {/* Mobile map toggle */}
      <button
        onClick={() => setShowMap(true)}
        className="lg:hidden fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2"
      >
        <span className="text-xl">📍</span> Показать карту
      </button>

      {showMap && (
        <div className="lg:hidden fixed inset-0 z-40 bg-white dark:bg-gray-900">
          <ListingMap listings={listings} userCoords={userCoords} />
          <button
            onClick={() => setShowMap(false)}
            className="absolute top-4 right-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-4 py-2 rounded-full shadow-lg"
          >
            ✕ Закрыть
          </button>
        </div>
      )}

      {/* Mobile drawer */}
      {mobileFiltersOpen && (
        <MobileFiltersDrawer
          priceMin={priceMin} priceMax={priceMax} setPriceMin={setPriceMin} setPriceMax={setPriceMax} priceBounds={priceBoundsRef.current}
          rooms={rooms} toggleRooms={(v)=>toggleSet(rooms, setRooms, v)}
          types={types} toggleTypes={(v)=>toggleSet(types, setTypes, v)}
          amenities={amenities} toggleAmenities={(v)=>toggleSet(amenities, setAmenities, v)}
          nearMetro={nearMetro} setNearMetro={setNearMetro}
          geoEnabled={geoEnabled} setGeoEnabled={setGeoEnabled}
          radius={radius} setRadius={setRadius}
          onClose={()=>setMobileFiltersOpen(false)}
          onReset={resetFilters}
          onApply={()=>{ applyFiltersToUrl(); setMobileFiltersOpen(false); }}
        />
      )}
    </div>
  );
}

/* ============================================================================
   FiltersPanel
   ============================================================================ */
function FiltersPanel({ priceMin, priceMax, setPriceMin, setPriceMax, priceBounds,
  rooms, toggleRooms, types, toggleTypes, amenities, toggleAmenities,
  nearMetro, setNearMetro, geoEnabled, setGeoEnabled, radius, setRadius,
  onReset, onApply }) {

  const roomOptions = [1,2,3,4];
  const typeOptions = [
    { id: "apartment", label: "Квартира" },
    { id: "house", label: "Дом" },
    { id: "studio", label: "Студия" },
  ];
  const amenOptions = [
    { id: "parking", label: "Парковка" },
    { id: "furniture", label: "Мебель" },
    { id: "elevator", label: "Лифт" },
    { id: "balcony", label: "Балкон" },
  ];
  const radiusOptions = ["1","3","5","10","20"];

  const onChangeMin = (v) => {
    const num = Number(v || 0);
    const maxAllowed = Math.max(priceBounds.min, priceMax);
    setPriceMin(Math.min(Math.max(priceBounds.min, num), priceBounds.max, maxAllowed));
  };
  const onChangeMax = (v) => {
    const num = Number(v || 0);
    const minAllowed = Math.min(priceBounds.max, priceMin);
    setPriceMax(Math.max(Math.min(priceBounds.max, num), priceBounds.min, minAllowed));
  };

  return (
    <div className="space-y-4">
      {/* Price */}
      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Цена</div>
        <div className="flex gap-2 items-center">
          <input type="number" value={priceMin} onChange={(e)=>onChangeMin(e.target.value)} className="w-1/2 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm" />
          <input type="number" value={priceMax} onChange={(e)=>onChangeMax(e.target.value)} className="w-1/2 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm" />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          От {formatPrice(priceMin)} до {formatPrice(priceMax)}
        </div>
      </div>

      {/* Rooms */}
      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Комнаты</div>
        <div className="flex flex-wrap gap-2">
          {roomOptions.map(r => (
            <button key={r} onClick={()=>toggleRooms(r)} className={`px-3 py-1 rounded-md text-sm border ${rooms.includes(r) ? "bg-emerald-600 text-white" : "bg-white dark:bg-gray-800"}`}>{r}</button>
          ))}
          <button onClick={()=>toggleRooms("4+")} className={`px-3 py-1 rounded-md text-sm border ${rooms.includes("4+") ? "bg-emerald-600 text-white" : "bg-white dark:bg-gray-800"}`}>4+</button>
        </div>
      </div>

      {/* Types */}
      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Тип жилья</div>
        <div className="flex flex-col gap-2">
          {typeOptions.map(t => (
            <label key={t.id} className="inline-flex items-center gap-2">
              <input type="checkbox" checked={types.includes(t.id)} onChange={()=>toggleTypes(t.id)} className="form-checkbox" />
              <span className="text-sm">{t.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Удобства</div>
        <div className="flex flex-wrap gap-2">
          {amenOptions.map(a => (
            <button key={a.id} onClick={()=>toggleAmenities(a.id)} className={`px-3 py-1 rounded-md text-sm border ${amenities.includes(a.id) ? "bg-emerald-600 text-white" : "bg-white dark:bg-gray-800"}`}>{a.label}</button>
          ))}
        </div>
      </div>

      {/* Near Metro */}
      <div>
        <label className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Рядом с метро</div>
          </div>
          <input type="checkbox" checked={nearMetro} onChange={e=>setNearMetro(e.target.checked)} className="form-checkbox" />
        </label>
      </div>

      {/* Geo filter */}
      <div>
        <label className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Рядом со мной</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Использовать текущую геопозицию</div>
          </div>
          <input type="checkbox" checked={geoEnabled} onChange={e=>setGeoEnabled(e.target.checked)} className="form-checkbox" />
        </label>
        {geoEnabled && (
          <div className="flex gap-2 flex-wrap mt-2">
            {radiusOptions.map(r => (
              <button key={r} onClick={()=>setRadius(r)} className={`px-3 py-1 rounded-md text-sm border ${radius===r ? "bg-emerald-600 text-white" : "bg-white dark:bg-gray-800"}`}>{r} км</button>
            ))}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="pt-2 flex gap-2">
        <button onClick={onApply} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg">Применить</button>
        <button onClick={onReset} className="flex-1 px-4 py-2 border rounded-lg">Сбросить</button>
      </div>
    </div>
  );
}

/* ============================================================================
   MobileFiltersDrawer
   ============================================================================ */
function MobileFiltersDrawer({ priceMin, priceMax, setPriceMin, setPriceMax, priceBounds,
  rooms, toggleRooms, types, toggleTypes, amenities, toggleAmenities,
  nearMetro, setNearMetro, geoEnabled, setGeoEnabled, radius, setRadius,
  onClose, onReset, onApply }) {

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Фильтры</h3>
          <div className="flex items-center gap-2">
            <button onClick={onReset} className="px-3 py-2 rounded-md text-sm">Сбросить</button>
            <button onClick={onClose} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">Закрыть</button>
          </div>
        </div>

        <div className="overflow-auto flex-1 space-y-6 pb-6">
          <FiltersPanel
            priceMin={priceMin} priceMax={priceMax} setPriceMin={setPriceMin} setPriceMax={setPriceMax} priceBounds={priceBounds}
            rooms={rooms} toggleRooms={toggleRooms} types={types} toggleTypes={toggleTypes} amenities={amenities} toggleAmenities={toggleAmenities}
            nearMetro={nearMetro} setNearMetro={setNearMetro} geoEnabled={geoEnabled} setGeoEnabled={setGeoEnabled}
            radius={radius} setRadius={setRadius} onReset={onReset} onApply={onApply}
          />
        </div>
      </div>
    </motion.div>
  );
}
