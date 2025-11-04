import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { motion } from "framer-motion";
import Link from "next/link";
import { MapPin, Search, Users, ChevronRight } from "lucide-react";

export default function ListingsPage({ city }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      let query = supabase.from("listings").select("*").order("id", { ascending: false });

      // если в хедере выбран город — фильтруем
      if (city) query = query.eq("city", city);

      const { data, error } = await query;
      if (error) console.error("Ошибка загрузки:", error);
      else setListings(data || []);
      setLoading(false);
    };
    fetchListings();
  }, [city]);

  const filtered = listings.filter((item) =>
    item.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-center mb-6"
      >
        🏠 Объявления {city ? `в ${city}` : ""}
      </motion.h1>

      {/* Поиск */}
      <div className="flex justify-center mb-6">
        <div className="relative w-full sm:w-2/3">
          <Search className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Загрузка объявлений...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-500">
          Объявлений не найдено 😔
        </p>
      ) : (
        <motion.div
          layout
          className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition"
            >
              <Link href={`/listings/${item.id}`} passHref>
                <div className="cursor-pointer">
                  <img
                    src={item.image_url || "/no-image.png"}
                    alt={item.title}
                    className="h-48 w-full object-cover"
                  />
                  <div className="p-4 space-y-2">
                    <h2 className="text-lg font-semibold line-clamp-1">
                      {item.title}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {item.description || "Без описания"}
                    </p>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin size={16} />
                      <span>{item.city}</span>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {item.price?.toLocaleString()} ₸
                      </span>
                      {item.totalSpots && (
                        <span className="text-sm flex items-center gap-1 text-gray-500">
                          <Users size={15} /> {item.filledSpots || 0}/{item.totalSpots}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end px-4 pb-3">
                    <ChevronRight
                      size={18}
                      className="text-gray-400 group-hover:text-indigo-500 transition"
                    />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
