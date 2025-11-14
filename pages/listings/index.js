import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { motion } from "framer-motion";
import ListingMap from "/components/ListingMap";

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
  return `${Number(n).toLocaleString()} ₸`;
}

/* =============================
   Основной компонент
   ============================= */
export default function Listings({ selectedCity }) {
  const router = useRouter();

  // данные
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // фильтры в UI (локальные, пока пользователь меняет)
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 350);

  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(200000);
  const priceBoundsRef = useRef({ min: 0, max: 200000 }); // границы для UI

  const [rooms, setRooms] = useState([]); // e.g. [1,2,3]
  const [types, setTypes] = useState([]); // e.g. ['apartment','house']
  const [amenities, setAmenities] = useState([]); // e.g. ['parking','furniture']
  const [nearMetro, setNearMetro] = useState(false);
  const [radius, setRadius] = useState("5"); // km as string: '1','3','5','10'

  // отображение фильтр-панели (desktop) и drawer (mobile)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // сортировка
  const [sort, setSort] = useState("newest"); // 'newest'|'price-asc'|'price-desc'

  // отображение карты на моб.
  const [showMap, setShowMap] = useState(false);

  // для подсчета активных фильтров
  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (debouncedSearch.trim()) c++;
    if ((priceMin || priceMax) && !(priceMin === 0 && priceMax === priceBoundsRef.current.max)) c++;
    if (rooms.length) c++;
    if (types.length) c++;
    if (amenities.length) c++;
    if (nearMetro) c++;
    if (radius && radius !== "5") c++; // 5 как дефолт
    return c;
  }, [debouncedSearch, priceMin, priceMax, rooms, types, amenities, nearMetro, radius]);

  /* -----------------------------
     Загрузка границ по цене (один раз) - можно брать из API/данных
     ----------------------------- */
  useEffect(() => {
    // Если хочется, можно загружать min/max из БД; пока ставим константы.
    const min = 0;
    const max = 300000; // например
    priceBoundsRef.current = { min, max };
    setPriceMin(min);
    setPriceMax(200000); // разумная дефолтная верхняя граница
  }, []);

  /* -----------------------------
     Формирование запроса к Supabase с применением фильтров
     ----------------------------- */
  const buildSupabaseQuery = async () => {
    let q = supabase.from("listings").select("*");

    if (selectedCity) q = q.eq("city", selectedCity);

    // Поиск по названию/описанию (ILIKE для нечувствительности)
    if (debouncedSearch?.trim()) {
      const like = `%${debouncedSearch.trim()}%`;
      // Если у вас много колонок, можно использовать or:
      q = q.or(`title.ilike.${like},description.ilike.${like}`);
    }

    // Цена
    if (priceMin != null) q = q.gte("price", priceMin);
    if (priceMax != null) q = q.lte("price", priceMax);

    // Кол-во комнат (предположим поле rooms)
    if (rooms.length) {
      // example: rooms = [1,2,3] -> filter rooms = any of these
      q = q.in("rooms", rooms);
    }

    // Тип жилья (property_type)
    if (types.length) q = q.in("property_type", types);

    // Удобства (amenities хранится как array в БД)
    if (amenities.length) {
      // supabase/Postgres: проверка, что массив amenities содержит все выбранные
      // Для 'contains' нужен оператор cs (передаётся как rpcвариант). Но supabase JS поддерживает .contains
      q = q.contains("amenities", amenities);
    }

    // Близость к метро — предполагается булево поле 'near_metro' или расстояние в метрах
    if (nearMetro) q = q.eq("near_metro", true);

    // Радиус — если есть гео-поля (lat/lng) и user location — тогда нужен поиск по радиусу на стороне сервера
    // Здесь просто демонстрация: если в БД есть поле 'search_radius_km' (прим.), можно фильтровать.
    // Оставим radius для клиентского использования (например, запрос к геосервису).
    // (Для реальной гео фильтрации: используйте PostGIS / geo queries и передавайте координаты)

    // Сортировка
    if (sort === "price-asc") q = q.order("price", { ascending: true });
    else if (sort === "price-desc") q = q.order("price", { ascending: false });
    else q = q.order("id", { ascending: false });

    // Ограничение (пагинация) - можно добавить limit/offset
    q = q.limit(100);

    return q;
  };

  /* -----------------------------
     Фетч данных (выполняется при изменении debounce-поиска, фильтров, sort, selectedCity)
     ----------------------------- */
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
        console.error("Ошибка загрузки объявлений:", e.message || e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, priceMin, priceMax, rooms.join(","), types.join(","), amenities.join(","), nearMetro, radius, sort, selectedCity]);

  /* -----------------------------
     Управление выбором комнат / типов / удобств
     ----------------------------- */
  const toggleSet = (arr, setArr, value) => {
    setArr((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  };

  /* -----------------------------
     Сброс фильтров (Reset)
     ----------------------------- */
  const resetFilters = () => {
    setSearch("");
    setPriceMin(priceBoundsRef.current.min);
    setPriceMax(priceBoundsRef.current.max);
    setRooms([]);
    setTypes([]);
    setAmenities([]);
    setNearMetro(false);
    setRadius("5");
    setSort("newest");
    // optionally close mobile drawer:
    setMobileFiltersOpen(false);
  };

  /* -----------------------------
     Применить фильтры -> можно обновить URL для shareable search
     ----------------------------- */
  const applyFiltersToUrl = () => {
    // Создаём query params для текущего состояния фильтров (мини-версия)
    const qp = {};
    if (search.trim()) qp.q = search.trim();
    if (priceMin !== priceBoundsRef.current.min) qp.pmin = priceMin;
    if (priceMax !== priceBoundsRef.current.max) qp.pmax = priceMax;
    if (rooms.length) qp.rooms = rooms.join(",");
    if (types.length) qp.type = types.join(",");
    if (amenities.length) qp.am = amenities.join(",");
    if (nearMetro) qp.metro = "1";
    if (radius && radius !== "5") qp.r = radius;
    if (sort && sort !== "newest") qp.sort = sort;
    // сохраняем в URL без перезагрузки
    router.replace({ pathname: router.pathname, query: { ...router.query, ...qp } }, undefined, { shallow: true });
  };

  /* -----------------------------
     UI рендер
     ----------------------------- */
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
      {/* Header: title + фильтры кратко */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Объявления {selectedCity ? `в ${selectedCity}` : ""}
          </h1>

          <div className="text-sm text-gray-600 dark:text-gray-300">— {listings.length} найдено</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 bg-white dark:bg-gray-800 border rounded-full px-2 py-1 shadow-sm">
            <button
              onClick={() => setMobileFiltersOpen((s) => !s)}
              className="px-3 py-2 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              aria-expanded={mobileFiltersOpen}
            >
              Фильтры {activeFiltersCount > 0 && <span className="ml-2 inline-block bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">{activeFiltersCount}</span>}
            </button>
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              aria-label="Сбросить фильтры"
            >
              Сбросить
            </button>
          </div>

          {/* Mobile: открытие drawer */}
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="md:hidden px-3 py-2 bg-emerald-600 text-white rounded-lg shadow-md"
            aria-label="Открыть фильтры"
          >
            Фильтры {activeFiltersCount > 0 && <span className="ml-2 inline-block bg-white text-emerald-600 text-xs px-2 py-0.5 rounded-full">{activeFiltersCount}</span>}
          </button>

          {/* Sort */}
          <div className="ml-2 flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 text-sm"
              aria-label="Сортировка"
            >
              <option value="newest">Новые</option>
              <option value="price-asc">Цена ↑</option>
              <option value="price-desc">Цена ↓</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search input (debounced) */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Поиск по названию или описанию..."
          className="w-full md:w-1/2 px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          aria-label="Поиск по объявлениям"
        />
      </div>

      {/* Desktop: фильтровая панель слева + список + карта справа */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_420px] gap-6">
        {/* Фильтры (desktop) */}
        <aside className="hidden lg:block">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm space-y-4 sticky top-24">
            <FiltersPanel
              priceMin={priceMin}
              priceMax={priceMax}
              setPriceMin={setPriceMin}
              setPriceMax={setPriceMax}
              priceBounds={priceBoundsRef.current}
              rooms={rooms}
              toggleRooms={(v) => toggleSet(rooms, setRooms, v)}
              types={types}
              toggleTypes={(v) => toggleSet(types, setTypes, v)}
              amenities={amenities}
              toggleAmenities={(v) => toggleSet(amenities, setAmenities, v)}
              nearMetro={nearMetro}
              setNearMetro={setNearMetro}
              radius={radius}
              setRadius={setRadius}
              onReset={resetFilters}
              onApply={() => { applyFiltersToUrl(); /* refetch triggered by deps */ }}
            />
          </div>
        </aside>

        {/* Список объявлений */}
        <main>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-2xl h-72" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} onClick={() => router.push(`/listings/${listing.id}`)} />
              ))}
            </div>
          )}
        </main>

        {/* Map (desktop) */}
        <div className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl overflow-hidden shadow-xl h-[70vh]">
            <ListingMap listings={listings} />
          </div>
        </div>
      </div>

      {/* Mobile: кнопка показать карту */}
      <button
        onClick={() => setShowMap(true)}
        className="lg:hidden fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2"
      >
        <span className="text-xl">📍</span> Показать карту
      </button>

      {/* Mobile: full-screen карта */}
      {showMap && (
        <div className="lg:hidden fixed inset-0 z-40 bg-white dark:bg-gray-900">
          <ListingMap listings={listings} />
          <button
            onClick={() => setShowMap(false)}
            className="absolute top-4 right-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-4 py-2 rounded-full shadow-lg"
          >
            ✕ Закрыть
          </button>
        </div>
      )}

      {/* Mobile: Drawer фильтров */}
      {mobileFiltersOpen && (
        <MobileFiltersDrawer
          priceMin={priceMin}
          priceMax={priceMax}
          setPriceMin={setPriceMin}
          setPriceMax={setPriceMax}
          priceBounds={priceBoundsRef.current}
          rooms={rooms}
          toggleRooms={(v) => toggleSet(rooms, setRooms, v)}
          types={types}
          toggleTypes={(v) => toggleSet(types, setTypes, v)}
          amenities={amenities}
          toggleAmenities={(v) => toggleSet(amenities, setAmenities, v)}
          nearMetro={nearMetro}
          setNearMetro={setNearMetro}
          radius={radius}
          setRadius={setRadius}
          onClose={() => setMobileFiltersOpen(false)}
          onReset={resetFilters}
          onApply={() => { applyFiltersToUrl(); setMobileFiltersOpen(false); }}
        />
      )}
    </div>
  );
}

/* ============================================================================
   Компоненты фильтр-панели (Desktop)
   ============================================================================ */
function FiltersPanel({
  priceMin, priceMax, setPriceMin, setPriceMax, priceBounds,
  rooms, toggleRooms, types, toggleTypes, amenities, toggleAmenities,
  nearMetro, setNearMetro, radius, setRadius, onReset, onApply
}) {
  // Предустановленные опции — легко расширяемые
  const roomOptions = [1, 2, 3, 4];
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
  const radiusOptions = ["1", "3", "5", "10", "20"];

  // Валидация ввода цен
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
      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Цена</div>

        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={priceMin}
            onChange={(e) => onChangeMin(e.target.value)}
            className="w-1/2 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
            aria-label="Минимальная цена"
          />
          <input
            type="number"
            value={priceMax}
            onChange={(e) => onChangeMax(e.target.value)}
            className="w-1/2 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
            aria-label="Максимальная цена"
          />
        </div>

        {/* lightweight 2-thumb ползунок emulation: два range overlaid */}
        <div className="relative mt-3">
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            value={priceMin}
            onChange={(e) => onChangeMin(e.target.value)}
            aria-label="Слайдер минимальной цены"
            className="w-full appearance-none h-2 bg-transparent"
          />
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            value={priceMax}
            onChange={(e) => onChangeMax(e.target.value)}
            aria-label="Слайдер максимальной цены"
            className="w-full appearance-none h-2 bg-transparent absolute left-0 top-0"
          />
          {/* визуальный индикатор */}
          <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div
            className="absolute top-1/2 transform -translate-y-1/2 h-2 bg-emerald-500 rounded-full"
            style={{
              left: `${((priceMin - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100}%`,
              right: `${100 - ((priceMax - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100}%`,
            }}
          />
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          От {formatPrice(priceMin)} до {formatPrice(priceMax)}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Комнаты</div>
        <div className="flex flex-wrap gap-2">
          {roomOptions.map((r) => (
            <button
              key={r}
              onClick={() => toggleRooms(r)}
              className={`px-3 py-1 rounded-md text-sm border ${rooms.includes(r) ? "bg-emerald-600 text-white border-emerald-600" : "bg-white dark:bg-gray-800"}`}
              aria-pressed={rooms.includes(r)}
            >
              {r} {r === 1 ? "комната" : "комн."}
            </button>
          ))}
          <button onClick={() => toggleRooms("4+")} className={`px-3 py-1 rounded-md text-sm border ${rooms.includes("4+") ? "bg-emerald-600 text-white" : "bg-white dark:bg-gray-800"}`}>
            4+
          </button>
        </div>
      </div>

      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Тип жилья</div>
        <div className="flex flex-col gap-2">
          {typeOptions.map((t) => (
            <label key={t.id} className="inline-flex items-center gap-2">
              <input type="checkbox" checked={types.includes(t.id)} onChange={() => toggleTypes(t.id)} className="form-checkbox" />
              <span className="text-sm">{t.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Удобства</div>
        <div className="flex flex-wrap gap-2">
          {amenOptions.map(a => (
            <button
              key={a.id}
              onClick={() => toggleAmenities(a.id)}
              className={`px-3 py-1 rounded-md text-sm border ${amenities.includes(a.id) ? "bg-emerald-600 text-white" : "bg-white dark:bg-gray-800"}`}
              aria-pressed={amenities.includes(a.id)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Рядом с метро</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Показывать только рядом с метро</div>
          </div>
          <input type="checkbox" checked={nearMetro} onChange={(e) => setNearMetro(e.target.checked)} className="form-checkbox" aria-label="Только рядом с метро" />
        </label>
      </div>

      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Радиус поиска (км)</div>
        <div className="flex gap-2 flex-wrap">
          {radiusOptions.map(r => (
            <button key={r} onClick={() => setRadius(r)} className={`px-3 py-1 rounded-md text-sm border ${radius === r ? "bg-emerald-600 text-white" : "bg-white dark:bg-gray-800"}`}>
              {r} км
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 flex gap-2">
        <button onClick={onApply} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg">Применить</button>
        <button onClick={onReset} className="flex-1 px-4 py-2 border rounded-lg">Сбросить</button>
      </div>
    </div>
  );
}

/* ============================================================================
   Mobile Filters Drawer
   ============================================================================ */
function MobileFiltersDrawer({
  priceMin, priceMax, setPriceMin, setPriceMax, priceBounds,
  rooms, toggleRooms, types, toggleTypes, amenities, toggleAmenities,
  nearMetro, setNearMetro, radius, setRadius, onClose, onReset, onApply
}) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      className="fixed inset-0 z-50 bg-white dark:bg-gray-900"
    >
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Фильтры</h3>
          <div className="flex items-center gap-2">
            <button onClick={onReset} className="px-3 py-2 rounded-md text-sm">Сбросить</button>
            <button onClick={onClose} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md">Закрыть</button>
          </div>
        </div>

        <div className="overflow-auto flex-1 space-y-6 pb-6">
          {/* Reuse same controls as desktop but simpler layout */}
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Цена</div>
            <div className="flex gap-2 items-center">
              <input type="number" value={priceMin} onChange={(e) => setPriceMin(Number(e.target.value || 0))} className="w-1/2 px-3 py-2 border rounded-lg" />
              <input type="number" value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value || 0))} className="w-1/2 px-3 py-2 border rounded-lg" />
            </div>
            <div className="text-xs text-gray-500 mt-2">От {formatPrice(priceMin)} до {formatPrice(priceMax)}</div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Комнаты</div>
            <div className="flex gap-2 flex-wrap">
              {[1,2,3,4].map(r => (
                <button key={r} onClick={() => toggleRooms(r)} className={`px-3 py-1 rounded-md ${rooms.includes(r) ? "bg-emerald-600 text-white" : "bg-gray-100"}`}>{r}</button>
              ))}
              <button onClick={() => toggleRooms("4+")} className={`px-3 py-1 rounded-md ${rooms.includes("4+") ? "bg-emerald-600 text-white" : "bg-gray-100"}`}>4+</button>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Тип</div>
            <div className="flex gap-2 flex-wrap">
              {["apartment","house","studio"].map(t => (
                <button key={t} onClick={() => toggleTypes(t)} className={`px-3 py-1 rounded-md ${types.includes(t) ? "bg-emerald-600 text-white" : "bg-gray-100"}`}>{t}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Удобства</div>
            <div className="flex gap-2 flex-wrap">
              {["parking","furniture","elevator","balcony"].map(a => (
                <button key={a} onClick={() => toggleAmenities(a)} className={`px-3 py-1 rounded-md ${amenities.includes(a) ? "bg-emerald-600 text-white" : "bg-gray-100"}`}>{a}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Рядом с метро</div>
              </div>
              <input type="checkbox" checked={nearMetro} onChange={(e) => setNearMetro(e.target.checked)} />
            </label>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Радиус (км)</div>
            <div className="flex gap-2">
              {["1","3","5","10"].map(r => (
                <button key={r} onClick={() => setRadius(r)} className={`px-3 py-1 rounded-md ${radius === r ? "bg-emerald-600 text-white" : "bg-gray-100"}`}>{r} км</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => { onApply(); }} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg">Применить</button>
          <button onClick={() => { onReset(); }} className="flex-1 px-4 py-3 border rounded-lg">Сбросить</button>
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================================
   Карточка объявления (компонент)
   ============================================================================ */
function ListingCard({ listing, onClick }) {
  // Удобный парсер изображений (устойчив к разным форматам)
  let images = [];
  try {
    if (Array.isArray(listing.image_urls)) images = listing.image_urls;
    else if (typeof listing.image_urls === "string") {
      images = listing.image_urls.replace(/[{}"]/g, "").split(",").map(s => s.trim()).filter(Boolean);
    } else if (listing.image_url) images = [listing.image_url];
  } catch (e) {
    images = [];
  }
  if (!images.length) images = ["/no-image.png"];

  return (
    <motion.div layout whileHover={{ scale: 1.02 }} className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-md cursor-pointer" onClick={onClick}>
      <div className="relative w-full h-56 bg-gray-100 dark:bg-gray-800">
        <img src={images[0]} alt={listing.title} className="w-full h-full object-cover" loading="lazy" />
        {images.length > 1 && <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md">+{images.length - 1}</span>}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">{listing.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{listing.description || "Без описания"}</p>

        <div className="flex items-center justify-between mt-2">
          <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {listing.price ? `${Number(listing.price).toLocaleString()} ₸` : "Договорная"}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">📍 {listing.city}</div>
        </div>
      </div>
    </motion.div>
  );
}
