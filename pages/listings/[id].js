import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { motion } from "framer-motion";
import MapView from "/components/MapView";

export default function ListingDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchListing = async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (error) console.error(error);
      setListing(data);
      setLoading(false);
    };
    fetchListing();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500 dark:text-gray-300">
        Загрузка объявления...
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-20 text-gray-500 dark:text-gray-300">
        Объявление не найдено 😕
      </div>
    );
  }

  // --- обработка изображений ---
  let images = [];
  try {
    if (Array.isArray(listing.image_urls)) {
      images = listing.image_urls;
    } else if (listing.image_urls && typeof listing.image_urls === "string") {
      // Преобразуем строку вида {"a.jpg","b.jpg"} в массив
      images = listing.image_urls
        .replace(/[{}"]/g, "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (listing.image_url) {
      images = [listing.image_url];
    }
  } catch (e) {
    console.warn("Ошибка парсинга image_urls:", e);
  }

  // --- если нет фото ---
  if (!images || images.length === 0) {
    images = ["/no-image.png"];
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <motion.div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Галерея */}
        <div className="relative">
          {images.length === 1 ? (
            <img
              src={images[0]}
              alt={listing.title}
              className="w-full h-96 object-cover"
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2">
              {images.map((img, i) => (
                <motion.img
                  key={i}
                  src={img}
                  alt={`Фото ${i + 1}`}
                  className="w-full h-60 object-cover rounded-xl cursor-pointer hover:opacity-90 transition"
                  whileHover={{ scale: 1.03 }}
                  onClick={() => window.open(img, "_blank")}
                />
              ))}
            </div>
          )}
        </div>

        {/* Контент */}
        <div className="p-6 space-y-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {listing.title}
          </h1>

          <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
            {listing.description || "Без описания"}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl">
              <p className="text-gray-700 dark:text-gray-200 font-medium">
                💰 Цена:
              </p>
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {listing.price?.toLocaleString()} ₸ / месяц
              </p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl">
              <p className="text-gray-700 dark:text-gray-200 font-medium">
                📍 Город:
              </p>
              <p className="text-xl font-semibold">{listing.city}</p>
            </div>
          </div>

          {(listing.totalSpots || listing.filledSpots) && (
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl">
              <p className="text-gray-700 dark:text-gray-200 font-medium">
                👥 Мест:
              </p>
              <p className="text-lg">
                {listing.filledSpots || 0} / {listing.totalSpots || "?"}
              </p>
            </div>
          )}

          {(listing.address || (listing.lat && listing.lng)) && (
            <MapView 
              address={listing.address}
              coordinates={listing.lat && listing.lng ? [listing.lat, listing.lng] : undefined}
              height="350px"
              showCard={true}
            />
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition"
            onClick={() => router.push("/listings")}
          >
            ← Вернуться к объявлениям
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
