import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Users, Heart, Share2, ArrowLeft, X } from "lucide-react";
import Link from "next/link";

export default function ListingDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

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

  if (loading)
    return <p className="text-center mt-10 text-gray-500">Загрузка...</p>;
  if (!listing)
    return <p className="text-center mt-10 text-gray-500">Объявление не найдено 😔</p>;

  // Галерея: если у объявления есть несколько изображений
  const images = listing.images
    ? JSON.parse(listing.images)
    : [listing.image_url || "/no-image.png"];

  const handleShare = async () => {
    try {
      await navigator.share({
        title: listing.title,
        text: "Посмотри это объявление на Korshi.kz",
        url: window.location.href,
      });
    } catch {
      console.log("Sharing not supported");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Основное изображение */}
      <div className="relative h-[60vh] w-full overflow-hidden rounded-b-3xl">
        <motion.img
          key={images[0]}
          src={images[0]}
          alt={listing.title}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => setSelectedImage(images[0])}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

        <div className="absolute top-4 left-4 flex items-center gap-3">
          <Link href="/listings">
            <button className="p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition">
              <ArrowLeft size={22} />
            </button>
          </Link>
        </div>

        <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg">{listing.title}</h1>
          <div className="flex items-center gap-2 text-gray-200">
            <MapPin size={16} /> {listing.city}
          </div>
        </div>
      </div>

      {/* Мини-галерея */}
      {images.length > 1 && (
        <div className="max-w-5xl mx-auto mt-6 px-4 grid grid-cols-3 md:grid-cols-5 gap-3">
          {images.slice(1).map((img, i) => (
            <motion.img
              key={i}
              src={img}
              alt={`Фото ${i + 2}`}
              whileHover={{ scale: 1.05 }}
              className="rounded-xl object-cover h-32 w-full cursor-pointer hover:opacity-90 transition"
              onClick={() => setSelectedImage(img)}
            />
          ))}
        </div>
      )}

      {/* Контент */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-5xl mx-auto px-6 py-10"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Описание</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLiked(!liked)}
              className={`p-2 rounded-full transition ${
                liked
                  ? "bg-red-500 text-white"
                  : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              <Heart size={20} fill={liked ? "currentColor" : "none"} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <p className="text-lg leading-relaxed mb-8">
          {listing.description || "Описание отсутствует."}
        </p>

        <div className="grid sm:grid-cols-2 gap-6 mb-10">
          <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl rounded-2xl shadow-lg p-6 space-y-3">
            <h3 className="font-semibold text-lg">🏙️ Информация</h3>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <MapPin size={18} /> <span>{listing.city}</span>
            </div>
            {listing.totalSpots && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Users size={18} />
                <span>
                  Мест занято: {listing.filledSpots || 0}/{listing.totalSpots}
                </span>
              </div>
            )}
          </div>

          <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl rounded-2xl shadow-lg p-6 space-y-3">
            <h3 className="font-semibold text-lg">💸 Стоимость</h3>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {listing.price?.toLocaleString()} ₸ / мес
            </p>
          </div>
        </div>

        {/* Контакты */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 text-white rounded-2xl p-6 shadow-xl text-center"
        >
          <h3 className="text-xl font-semibold mb-2">Связаться с владельцем</h3>
          <p className="text-indigo-100 mb-4">
            Напишите владельцу, чтобы обсудить детали или договориться о просмотре.
          </p>
          <button className="bg-white text-indigo-600 font-medium px-6 py-2 rounded-xl hover:bg-gray-100 transition">
            💬 Написать владельцу
          </button>
        </motion.div>
      </motion.div>

      {/* Fullscreen просмотр фото */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          >
            <motion.img
              key={selectedImage}
              src={selectedImage}
              alt="Просмотр фото"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-5 right-5 bg-white/20 hover:bg-white/40 p-2 rounded-full"
            >
              <X size={24} className="text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
