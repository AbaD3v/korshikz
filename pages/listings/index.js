// pages/listings/index.js
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
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
  n == null ? "" : `${Number(n).toLocaleString("ru-RU")} ₸`;

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

  /* FILTERS */
  const priceBoundsRef = useRef({ min: 0, max: 1000000 });
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(1000000);

  const [rooms, setRooms] = useState([]);
  const [types, setTypes] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [nearMetro, setNearMetro] = useState(false);

  const [geoEnabled, setGeoEnabled] = useState(false);
  const [radius, setRadius] = useState("5");
  const [userCoords, setUserCoords] = useState(null);

  const [sort, setSort] = useState("newest");

  /* MOBILE FILTERS */
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);

  /* ACTIVE FILTERS COUNT */
  const activeFilters = useMemo(() => {
    let c = 0;
    if (debouncedSearch.trim()) c++;
    if (rooms.length) c++;
    if (types.length) c++;
    if (amenities.length) c++;
    if (nearMetro) c++;
    if (geoEnabled) c++;
    if (priceMin !== 0 || priceMax !== priceBoundsRef.current.max) c++;
    return c;
  }, [debouncedSearch, rooms, types, amenities, nearMetro, geoEnabled, priceMin, priceMax]);

  /* INIT PRICE BOUNDS */
  useEffect(() => {
    priceBoundsRef.current = { min: 0, max: 1000000 };
    setPriceMin(0);
    setPriceMax(1000000);
  }, []);

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

  /* SUPABASE RPC QUERY (search_listings) */
  const buildAndRunQuery = async () => {
    // Prepare RPC params: pass NULL for unused filters
  const rpcParams = {
  p_price_min: priceMin !== 0 ? priceMin : null,
  p_price_max: priceMax !== priceBoundsRef.current.max ? priceMax : null,

  p_rooms: rooms.length ? rooms.map(String) : null,
  p_types: types.length ? types.map(String) : null,
  p_amenities: amenities.length ? amenities.map(String) : null,

  p_near_metro: nearMetro ? true : null,

  // GEO
  p_lat: geoEnabled && userCoords ? Number(userCoords[0]) : null,
  p_lng: geoEnabled && userCoords ? Number(userCoords[1]) : null,
  p_radius_km: geoEnabled ? Number(radius) : null,

  p_limit: 200
};



    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("search_listings", rpcParams);
      if (error) throw error;
      // data is array of listings (SETOF listings)
      setListings(data || []);
      if (data) {
        window.__LOADED_LISTINGS__ = data;
        if (data.length) console.log("First listing:", data[0]);
      }
    } catch (err) {
      console.error("RPC Load error:", err.message || err);
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
    // NOTE: we serialize arrays by joining to string in deps to avoid unnecessary rerenders
  }, [
    debouncedSearch,
    priceMin,
    priceMax,
    rooms.join(","),
    types.join(","),
    amenities.join(","),
    nearMetro,
    geoEnabled,
    radius,
    sort,
    selectedCity,
    // userCoords may come async; include it as dependency
    userCoords ? userCoords.join(",") : null,
  ]);

  /* FILTER HELPERS */
  const toggleSet = (arr, setArr, val) =>
    setArr((p) => (p.includes(val) ? p.filter((x) => x !== val) : [...p, val]));

  const resetFilters = () => {
    setSearch("");
    setPriceMin(0);
    setPriceMax(priceBoundsRef.current.max);
    setRooms([]);
    setTypes([]);
    setAmenities([]);
    setNearMetro(false);
    setGeoEnabled(false);
    setRadius("5");
    setSort("newest");
  };

  const applyUrlFilters = () => {
    const q = {};

    if (search.trim()) q.q = search;
    if (rooms.length) q.rooms = rooms.join(",");
    if (types.length) q.types = types.join(",");
    if (amenities.length) q.am = amenities.join(",");

    router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
  };

  /* ==========================================
      RENDER
  =========================================== */

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-16">

      {/* TOP BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Объявления {selectedCity ? `в ${selectedCity}` : ""}
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">

          <input
            type="text"
            placeholder="🔍 Поиск..."
            className="w-full sm:w-72 px-3 py-2 rounded-lg border bg-gray-50 dark:bg-gray-800 dark:text-white"
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
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_480px] gap-8">

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
              types={types}
              amenities={amenities}
              radius={radius}
              nearMetro={nearMetro}
              geo={geoEnabled}
              toggleSet={toggleSet}
              setNearMetro={setNearMetro}
              setTypes={setTypes}
              setRooms={setRooms}
              setAmenities={setAmenities}
              setRadius={setRadius}
              setGeo={setGeoEnabled}
              apply={applyUrlFilters}
              reset={resetFilters}
            />
          </div>
        </aside>

        {/* LISTINGS */}
        <main>
          {loading ? (
            <ListingSkeleton />
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
    COMPONENTS (unchanged UI helpers)
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
    FILTERS PANEL
========================================== */

function Filters({
  priceMin,
  priceMax,
  setPriceMin,
  setPriceMax,
  bounds,
  rooms,
  types,
  amenities,
  radius,
  nearMetro,
  geo,
  toggleSet,
  setNearMetro,
  setTypes,
  setRooms,
  setAmenities,
  setRadius,
  setGeo,
  apply,
  reset,
}) {
  return (
    <div className="space-y-6 text-gray-800 dark:text-gray-200">

      {/* PRICE */}
      <section>
        <Label>Цена</Label>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            value={priceMin}
            onChange={(e) => setPriceMin(Number(e.target.value))}
          />
          <Input
            type="number"
            value={priceMax}
            onChange={(e) => setPriceMax(Number(e.target.value))}
          />
        </div>
        <Hint>
          От {formatPrice(priceMin)} до {formatPrice(priceMax)}
        </Hint>
      </section>

      {/* ROOMS */}
      <section>
        <Label>Комнаты</Label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((r) => (
            <Tag
              key={r}
              active={rooms.includes(r)}
              onClick={() => toggleSet(rooms, setRooms, r)}
            >
              {r}
            </Tag>
          ))}
          <Tag
            active={rooms.includes("4+")}
            onClick={() => toggleSet(rooms, setRooms, "4+")}
          >
            4+
          </Tag>
        </div>
      </section>

      {/* TYPES */}
      <section>
        <Label>Тип жилья</Label>
        <CheckList
          list={[
            ["apartment", "Квартира"],
            ["house", "Дом"],
            ["studio", "Студия"],
          ]}
          active={types}
          toggle={(id) => toggleSet(types, setTypes, id)}
        />
      </section>

      {/* AMENITIES */}
      <section>
        <Label>Удобства</Label>
        <div className="flex flex-wrap gap-2">
          {[
            ["parking", "Парковка"],
            ["furniture", "Мебель"],
            ["elevator", "Лифт"],
            ["balcony", "Балкон"],
          ].map(([id, label]) => (
            <Tag
              key={id}
              active={amenities.includes(id)}
              onClick={() => toggleSet(amenities, setAmenities, id)}
            >
              {label}
            </Tag>
          ))}
        </div>
      </section>

      {/* METRO */}
      <section>
        <Switch
          label="Рядом с метро"
          checked={nearMetro}
          onChange={(e) => setNearMetro(e.target.checked)}
        />
      </section>

      {/* GEO */}
      <section>
        <Switch
          label="Рядом со мной"
          sub="Использовать геолокацию"
          checked={geo}
          onChange={(e) => setGeo(e.target.checked)}
        />

        {geo && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {["1", "3", "5", "10", "20"].map((r) => (
              <Tag
                key={r}
                active={radius === r}
                onClick={() => setRadius(r)}
              >
                {r} км
              </Tag>
            ))}
          </div>
        )}
      </section>

      {/* BUTTONS */}
      <div className="pt-2 flex gap-2">
        <button className="px-4 py-2 flex-1 bg-emerald-600 rounded-lg" onClick={apply}>
          Применить
        </button>
        <button className="px-4 py-2 flex-1 border rounded-lg" onClick={reset}>
          Сбросить
        </button>
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
    className={`
      px-3 py-1 rounded-md text-sm border transition
      ${active
        ? "bg-emerald-600 border-emerald-600 text-white"
        : "bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
      }
    `}
  >
    {children}
  </button>
);

const CheckList = ({ list, active, toggle }) => (
  <div className="flex flex-col gap-2">
    {list.map(([id, label]) => (
      <label
        key={id}
        className="flex items-center gap-2 cursor-pointer text-gray-800 dark:text-gray-200"
      >
        <input
          type="checkbox"
          checked={active.includes(id)}
          onChange={() => toggle(id)}
        />
        <span className="text-sm">{label}</span>
      </label>
    ))}
  </div>
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
