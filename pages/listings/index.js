import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

export default function Listings({ selectedCity }) {
  const [listings, setListings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    city: selectedCity || "",
    sort: "newest",
  });

  const router = useRouter();

  useEffect(() => {
    fetchListings();
  }, [selectedCity]);

  const fetchListings = async () => {
    setLoading(true);
    let query = supabase.from("listings").select("*").order("id", { ascending: false });

    if (selectedCity) query = query.eq("city", selectedCity);

    const { data, error } = await query;
    if (error) console.error("Ошибка загрузки:", error);
    setListings(data || []);
    setFiltered(data || []);
    setLoading(false);
  };

  // 🔍 Поиск + фильтры
  useEffect(() => {
    let results = [...listings];

    if (search.trim()) {
      results = results.filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filters.minPrice)
      results = results.filter((i) => i.price >= parseFloat(filters.minPrice));
    if (filters.maxPrice)
      results = results.filter((i) => i.price <= parseFloat(filters.maxPrice));

    if (filters.city)
      results = results.filter(
        (i) => i.city.toLowerCase() === filters.city.toLowerCase()
      );

    if (filters.sort === "price-asc") results.sort((a, b) => a.price - b.price);
    if (filters.sort === "price-desc") results.sort((a, b) => b.price - a.price);
    if (filters.sort === "newest") results.sort((a, b) => b.id - a.id);

    setFiltered(results);
  }, [search, filters, listings]);

  if (loading)
    return (
      <div className="text-center py-20 text-gray-500 dark:text-gray-300">
        Загрузка объявлений...
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
      {/* Header + поиск + фильтр */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Объявления {selectedCity ? `в ${selectedCity}` : ""}
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="🔍 Поиск по названию..."
            className="w-full sm:w-72 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={() => setShowFilters(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            Фильтр
          </button>
        </div>
      </div>

      {/* --- Панель фильтров --- */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex justify-end z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              className="w-80 bg-white dark:bg-gray-900 h-full p-6 shadow-xl overflow-y-auto"
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                ⚙️ Фильтры
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block mb-1 text-gray-700 dark:text-gray-300">
                    Город
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    value={filters.city}
                    onChange={(e) =>
                      setFilters({ ...filters, city: e.target.value })
                    }
                    placeholder="Введите город..."
                  />
                </div>

                <div>
                  <label className="block mb-1 text-gray-700 dark:text-gray-300">
                    Цена (от)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    value={filters.minPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, minPrice: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block mb-1 text-gray-700 dark:text-gray-300">
                    Цена (до)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    value={filters.maxPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, maxPrice: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block mb-1 text-gray-700 dark:text-gray-300">
                    Сортировать по
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    value={filters.sort}
                    onChange={(e) =>
                      setFilters({ ...filters, sort: e.target.value })
                    }
                  >
                    <option value="newest">Новейшие</option>
                    <option value="price-asc">Сначала дешёвые</option>
                    <option value="price-desc">Сначала дорогие</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full mt-6 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700"
                >
                  Применить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Список объявлений --- */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500 dark:text-gray-300">
          Ничего не найдено 😕
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((listing) => {
            let images = [];
            try {
              if (Array.isArray(listing.image_urls)) images = listing.image_urls;
              else if (listing.image_urls && typeof listing.image_urls === "string") {
                images = listing.image_urls
                  .replace(/[{}"]/g, "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
              } else if (listing.image_url) images = [listing.image_url];
            } catch (e) {
              console.warn("Ошибка парсинга image_urls:", e);
            }
            if (!images.length) images = ["/no-image.png"];

            return (
              <motion.div
                key={listing.id}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all cursor-pointer"
                whileHover={{ scale: 1.02 }}
                onClick={() => router.push(`/listings/${listing.id}`)}
              >
                <div className="relative w-full h-60 bg-gray-100 dark:bg-gray-800">
                  <img
                    src={images[0]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {images.length > 1 && (
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                      +{images.length - 1} фото
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {listing.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
                    {listing.description || "Без описания"}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {listing.price ? `${listing.price.toLocaleString()} ₸` : "Договорная"}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
                      📍 {listing.city}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
