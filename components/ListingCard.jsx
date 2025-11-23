// components/ListingCard.jsx
import { motion } from "framer-motion";

function formatPrice(n) {
  if (n == null) return "";
  return `${Number(n).toLocaleString("ru-RU")} ₸`;
}

export default function ListingCard({ listing, onClick }) {
  let images = [];
  try {
    if (Array.isArray(listing.image_urls)) images = listing.image_urls;
    else if (typeof listing.image_urls === "string") {
      images = listing.image_urls.replace(/[{}"]/g, "").split(",").map(s => s.trim()).filter(Boolean);
    } else if (listing.image_url) images = [listing.image_url];
  } catch (e) { images = []; }
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
            {listing.price ? formatPrice(listing.price) : "Договорная"}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">📍 {listing.city}</div>
        </div>
      </div>
    </motion.div>
  );
}
