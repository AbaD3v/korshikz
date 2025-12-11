// pages/listings/index.js
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from '@/lib/supabaseClient';
import { motion } from "framer-motion";

import ListingMap from "/components/ListingMap";
import ListingCard from "/components/ListingCard";

/* ==========================================
    UTILS
========================================== */

function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const formatPrice = (n) =>
  n == null || n === "" ? "" : `${Number(n).toLocaleString("ru-RU")} ₸`;

/* ==========================================
    MAIN PAGE
========================================== */

export default function Listings({ selectedCity }) {
  const router = useRouter();

  /* DATA */
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  /* SEARCH */
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);

  /* FILTERS STATE (clearly named) */
  const priceBoundsRef = useRef({ min: 0, max: 1000000 });
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(1000000);

  const [rooms, setRooms] = useState([]); // integer array
  const [types, setTypes] = useState([]); // 'apartment','house',...
  const [propertyTypes, setPropertyTypes] = useState([]); // property_type values
  const [district, setDistrict] = useState("");
  const [rentTypes, setRentTypes] = useState([]); // rent_type values
  const [yearBuilt, setYearBuilt] = useState("");
  const [categories, setCategories] = useState([]); // category values
  const [areaMin, setAreaMin] = useState("");
  const [areaMax, setAreaMax] = useState("");
  const [floor, setFloor] = useState("");
  const [floorsTotal, setFloorsTotal] = useState("");

  const [nearMetro, setNearMetro] = useState(false);

  const [geoEnabled, setGeoEnabled] = useState(false);
  const [radius, setRadius] = useState("5");
  const [userCoords, setUserCoords] = useState(null);

  const [sort, setSort] = useState("newest");

  /* MOBILE FILTERS */
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);

  /* COUNT OF ACTIVE FILTERS */
  const activeFilters = useMemo(() => {
    let c = 0;
    if (debouncedSearch.trim()) c++;
    if (rooms.length) c++;
    if (types.length) c++;
    if (propertyTypes.length) c++;
    if (district.trim()) c++;
    if (rentTypes.length) c++;
    if (yearBuilt) c++;
    if (categories.length) c++;
    if (areaMin || areaMax) c++;
    if (floor || floorsTotal) c++;
    if (nearMetro) c++;
    if (geoEnabled) c++;
    if (priceMin !== 0 || priceMax !== priceBoundsRef.current.max) c++;
    return c;
  }, [
    debouncedSearch,
    rooms,
    types,
    propertyTypes,
    district,
    rentTypes,
    yearBuilt,
    categories,
    areaMin,
    areaMax,
    floor,
    floorsTotal,
    nearMetro,
    geoEnabled,
    priceMin,
    priceMax,
  ]);

  /* INIT PRICE BOUNDS (could be dynamic later) */
  useEffect(() => {
    priceBoundsRef.current = { min: 0, max: 1000000 };
    setPriceMin(0);
    setPriceMax(1000000);
  }, []);
x
  /* GEO LOCATION */
  useEffect(() => {
    if (!geoEnabled) {
      setUserCoords(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.warn("Geolocation error:", err);
        setGeoEnabled(false);
        setUserCoords(null);
      },
      { enableHighAccuracy: true, maximumAge: 60_000 }
    );
  }, [geoEnabled]);

  /* helper toggle for arrays */
  const toggleArray = (setter, val) =>
    setter((prev = []) =>
      Array.isArray(prev) ? (prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]) : [val]
    );

  const resetFilters = () => {
    setSearch("");
    setPriceMin(priceBoundsRef.current.min ?? 0);
    setPriceMax(priceBoundsRef.current.max ?? 1000000);
    setRooms([]);
    setTypes([]);
    setPropertyTypes([]);
    setDistrict("");
    setRentTypes([]);
    setYearBuilt("");
    setCategories([]);
    setAreaMin("");
    setAreaMax("");
    setFloor("");
    setFloorsTotal("");
    setNearMetro(false);
    setGeoEnabled(false);
    setRadius("5");
    setSort("newest");
  };

  /* Build RPC params and run server-side search (fallback to basic select) */
  const buildAndRunQuery = async () => {
    setLoading(true);

    const rpcParams = {
      p_q: debouncedSearch.trim() ? debouncedSearch.trim() : null,
      p_price_min: priceMin !== 0 ? Number(priceMin) : null,
      p_price_max: priceMax !== priceBoundsRef.current.max ? Number(priceMax) : null,
      p_rooms: rooms.length ? rooms.map(Number) : null,
      p_types: types.length ? types : null,
      p_property_type: propertyTypes.length ? propertyTypes : null,
      p_district: district.trim() ? district.trim() : null,
      p_rent_type: rentTypes.length ? rentTypes : null,
      p_year_built: yearBuilt ? Number(yearBuilt) : null,
      p_category: categories.length ? categories : null,
      p_area_min: areaMin ? Number(areaMin) : null,
      p_area_max: areaMax ? Number(areaMax) : null,
      p_floor: floor ? Number(floor) : null,
      p_floors_total: floorsTotal ? Number(floorsTotal) : null,
      p_near_metro: nearMetro ? true : null,
      p_lat: geoEnabled && userCoords ? Number(userCoords[0]) : null,
      p_lng: geoEnabled && userCoords ? Number(userCoords[1]) : null,
      p_radius_km: geoEnabled ? Number(radius) : null,
      p_limit: 200,
      p_sort: sort || "newest",
      p_city: selectedCity ?? null,
    };

    try {
      const { data, error } = await supabase.rpc("search_listings", rpcParams);
      if (error) throw error;
      setListings(Array.isArray(data) ? data : []);
      // keep a global cache for debugging if needed
      window.__LOADED_LISTINGS__ = data;
    } catch (rpcErr) {
      console.warn("RPC failed, falling back to client select:", rpcErr);
      try {
        // basic fallback: select everything then do light client-side filtering (safe fallback)
        const { data: all, error: selErr } = await supabase
          .from("listings")
          .select("*")
          .limit(500);
        if (selErr) throw selErr;

        let filtered = all || [];

        // client-side light filters (only applied when RPC not available)
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.trim().toLowerCase();
          filtered = filtered.filter(
            (l) =>
              (l.title && l.title.toLowerCase().includes(q)) ||
              (l.description && l.description.toLowerCase().includes(q))
          );
        }

        if (selectedCity) filtered = filtered.filter((l) => l.city === selectedCity);

        setListings(filtered);
      } catch (selErr) {
        console.error("Fallback select error:", selErr);
        setListings([]);
      }
    } finally {
      setLoading(false);
    }
  };

  /* FETCH on filters change */
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      await buildAndRunQuery();
    };
    load();
    return () => {
      mounted = false;
    };
  }, [
    debouncedSearch,
    priceMin,
    priceMax,
    rooms.join(","),
    types.join(","),
    propertyTypes.join(","),
    district,
    rentTypes.join(","),
    yearBuilt,
    categories.join(","),
    areaMin,
    areaMax,
    floor,
    floorsTotal,
    nearMetro,
    geoEnabled,
    radius,
    sort,
    selectedCity,
    userCoords ? userCoords.join(",") : null,
  ]);

  const applyUrlFilters = () => {
    const q = {};
    if (debouncedSearch.trim()) q.q = debouncedSearch.trim();
    if (rooms.length) q.rooms = rooms.join(",");
    if (types.length) q.types = types.join(",");
    if (propertyTypes.length) q.pt = propertyTypes.join(",");
    if (district) q.district = district;
    router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-16">
      {/* TOP BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Объявления {selectedCity ? `в ${selectedCity}` : ""}
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
          <input
            type="text"
            placeholder="🔍 Поиск по заголовку и описанию..."
            className="w-full sm:w-80 px-3 py-2 rounded-lg border bg-gray-50 dark:bg-gray-800 dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex gap-2">
            <SortButton active={sort === "newest"} onClick={() => setSort("newest")}>Новые</SortButton>
            <SortButton active={sort === "price-asc"} onClick={() => setSort("price-asc")}>↑ Цена</SortButton>
            <SortButton active={sort === "price-desc"} onClick={() => setSort("price-desc")}>↓ Цена</SortButton>
            <SortButton active={sort === "distance"} onClick={() => setSort("distance")}>◷ По расстоянию</SortButton>
          </div>
        </div>
      </div>

      {/* GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_480px] gap-8">
        {/* LEFT FILTERS */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-xl space-y-6">
            <Filters
              priceMin={priceMin}
              priceMax={priceMax}
              setPriceMin={setPriceMin}
              setPriceMax={setPriceMax}
              bounds={priceBoundsRef.current}
              rooms={rooms}
              setRooms={setRooms}
              types={types}
              setTypes={setTypes}
              propertyTypes={propertyTypes}
              setPropertyTypes={setPropertyTypes}
              district={district}
              setDistrict={setDistrict}
              rentTypes={rentTypes}
              setRentTypes={setRentTypes}
              yearBuilt={yearBuilt}
              setYearBuilt={setYearBuilt}
              categories={categories}
              setCategories={setCategories}
              areaMin={areaMin}
              areaMax={areaMax}
              setAreaMin={setAreaMin}
              setAreaMax={setAreaMax}
              floor={floor}
              setFloor={setFloor}
              floorsTotal={floorsTotal}
              setFloorsTotal={setFloorsTotal}
              nearMetro={nearMetro}
              setNearMetro={setNearMetro}
              geo={geoEnabled}
              setGeo={setGeoEnabled}
              radius={radius}
              setRadius={setRadius}
              toggleArray={toggleArray}
              apply={applyUrlFilters}
              reset={resetFilters}
            />
          </div>
        </aside>

        {/* LISTINGS */}
        <main>
          {loading ? (
            <ListingSkeleton />
          ) : listings.length === 0 ? (
            <div className="p-8 text-center text-gray-600">Объявлений не найдено по текущим фильтрам.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
              {listings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  onClick={() => router.push(`/listings/${l.id}`)}
                />
              ))}
            </div>
          )}
        </main>

        {/* MAP */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 h-[calc(100vh-6rem)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-2xl">
            <ListingMap listings={listings} userCoords={userCoords} />
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ==========================================
    SMALL UI HELPERS
========================================== */

function SortButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border transition ${
        active
          ? "bg-emerald-600 text-white"
          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function ListingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="animate-pulse bg-white dark:bg-gray-800 rounded-2xl h-[340px] shadow-sm border border-gray-100 dark:border-gray-700" key={i} />
      ))}
    </div>
  );
}

/* ==========================================
    FILTERS PANEL (clean, safe props)
========================================== */

function Filters({
  priceMin, priceMax, setPriceMin, setPriceMax, bounds,
  rooms, setRooms,
  types, setTypes,
  propertyTypes, setPropertyTypes,
  district, setDistrict,
  rentTypes, setRentTypes,
  yearBuilt, setYearBuilt,
  categories, setCategories,
  areaMin, areaMax, setAreaMin, setAreaMax,
  floor, setFloor, floorsTotal, setFloorsTotal,
  nearMetro, setNearMetro,
  geo, setGeo, radius, setRadius,
  toggleArray, apply, reset
}) {
  return (
    <div className="space-y-6 text-gray-800 dark:text-gray-200">
      {/* PRICE */}
      <section>
        <Label>Цена</Label>
        <div className="flex gap-2 items-center">
          <Input type="number" value={priceMin} onChange={(e) => setPriceMin(Number(e.target.value || 0))} />
          <Input type="number" value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value || bounds.max))} />
        </div>
      </section>

      {/* ROOMS */}
      <section>
        <Label>Комнаты</Label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((r) => (
            <Tag key={r} active={rooms.includes(r)} onClick={() => toggleArray(setRooms, r)}>{r}</Tag>
          ))}
        </div>
      </section>

      {/* TYPE */}
      <section>
        <Label>Тип жилья</Label>
        <div className="flex flex-wrap gap-2">
          {[
            ["apartment", "Квартира"],
            ["house", "Дом"],
            ["studio", "Студия"],
            ["room", "Комната"],
          ].map(([id, label]) => (
            <Tag key={id} active={types.includes(id)} onClick={() => toggleArray(setTypes, id)}>{label}</Tag>
          ))}
        </div>
      </section>

      {/* PROPERTY TYPE */}
      <section>
        <Label>Property Type</Label>
        <div className="flex flex-wrap gap-2">
          {[
            ["new", "Новостройка"],
            ["secondary", "Вторичка"],
            ["elite", "Элитная"],
            ["other", "Другое"],
          ].map(([id, label]) => (
            <Tag key={id} active={propertyTypes.includes(id)} onClick={() => toggleArray(setPropertyTypes, id)}>{label}</Tag>
          ))}
        </div>
      </section>

      {/* DISTRICT */}
      <section>
        <Label>Район</Label>
        <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Например: Бостандык" />
      </section>

      {/* RENT TYPE */}
      <section>
        <Label>Тип аренды</Label>
        <div className="flex flex-wrap gap-2">
          {[
            ["daily", "Посуточно"],
            ["long", "Долгосрочно"],
            ["room", "Комната"],
            ["bed", "Кровать"],
          ].map(([id, label]) => (
            <Tag key={id} active={rentTypes.includes(id)} onClick={() => toggleArray(setRentTypes, id)}>{label}</Tag>
          ))}
        </div>
      </section>

      {/* YEAR BUILT */}
      <section>
        <Label>Год постройки</Label>
        <Input type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} />
      </section>

      {/* CATEGORY */}
      <section>
        <Label>Категория</Label>
        <div className="flex flex-wrap gap-2">
          {[
            ["student", "Для студентов"],
            ["family", "Для семьи"],
            ["elite", "Элитная"],
          ].map(([id, label]) => (
            <Tag key={id} active={categories.includes(id)} onClick={() => toggleArray(setCategories, id)}>{label}</Tag>
          ))}
        </div>
      </section>

      {/* AREA */}
      <section>
        <Label>Площадь (м²)</Label>
        <div className="flex gap-2">
          <Input type="number" value={areaMin} onChange={(e) => setAreaMin(e.target.value)} placeholder="Мин." />
          <Input type="number" value={areaMax} onChange={(e) => setAreaMax(e.target.value)} placeholder="Макс." />
        </div>
      </section>

      {/* FLOOR */}
      <section>
        <Label>Этаж / этажность</Label>
        <div className="flex gap-2">
          <Input type="number" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Этаж" />
          <Input type="number" value={floorsTotal} onChange={(e) => setFloorsTotal(e.target.value)} placeholder="Всего этажей" />
        </div>
      </section>

      {/* METRO */}
      <section>
        <Switch label="Рядом с метро" checked={nearMetro} onChange={(e) => setNearMetro(e.target.checked)} />
      </section>

      {/* GEO */}
      <section>
        <Switch label="Рядом со мной" sub="Использовать геолокацию" checked={geo} onChange={(e) => setGeo(e.target.checked)} />
        {geo && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {["1", "3", "5", "10", "20"].map((r) => (
              <Tag key={r} active={radius === r} onClick={() => setRadius(r)}>{r} км</Tag>
            ))}
          </div>
        )}
      </section>

      {/* BUTTONS */}
      <div className="pt-2 flex gap-2">
        <button className="px-4 py-2 flex-1 bg-emerald-600 rounded-lg text-white" onClick={apply}>Применить</button>
        <button className="px-4 py-2 flex-1 border rounded-lg" onClick={reset}>Сбросить</button>
      </div>
    </div>
  );
}

/* ==========================================
    SMALL UI ELEMENTS — FIXED
========================================== */

const Label = ({ children }) => (
  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
    {children}
  </div>
);

const Hint = ({ children }) => (
  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
    {children}
  </div>
);

const Input = (props) => (
  <input
    {...props}
    className="
      w-full px-3 py-2 rounded-lg text-sm 
      bg-gray-100 border border-gray-300 text-gray-800
      dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200
      transition
    "
  />
);

const Tag = ({ active, children, ...props }) => (
  <button
    {...props}
    className={`px-3 py-1 rounded-md text-sm border transition ${
      active
        ? "bg-emerald-600 border-emerald-600 text-white"
        : "bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
    }`}
  >
    {children}
  </button>
);

const Switch = ({ label, sub, checked, onChange }) => (
  <label className="flex items-center justify-between cursor-pointer">
    <div>
      <div className="text-sm font-medium text-gray-800 dark:text-gray-300">
        {label}
      </div>
      {sub && (
        <div className="text-xs text-gray-500 dark:text-gray-500">{sub}</div>
      )}
    </div>

    <input type="checkbox" checked={checked} onChange={onChange} />
  </label>
);
