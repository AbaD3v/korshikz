import { motion } from "framer-motion";
import Image from "next/image";
import { useMemo, useState, useRef } from "react";

const formatPrice = (n) => (n == null ? "" : `${Number(n).toLocaleString("ru-RU")} ₸`);

export default function ListingCard({ listing, onClick }) {
  // image_urls is expected (external links). Fallback to listing.images for compatibility.
  const urls = useMemo(() => listing.image_urls ?? listing.images ?? [], [listing]);
  const [mainIndex, setMainIndex] = useState(0);
  const thumbsRef = useRef(null);

  const mainSrc = urls?.[mainIndex] ?? "/placeholder.png";

  const onThumbClick = (i) => {
    setMainIndex(i);
    // scroll thumbnail into view for better UX
    const container = thumbsRef.current;
    const btn = container?.querySelector(`[data-thumb-index=\"${i}\"]`);
    btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="cursor-pointer bg-white dark:bg-[#0f172a] border border-gray-100 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden h-full flex flex-col"
      role="article"
      aria-label={listing.title}
    >
      {/* IMAGE AREA */}
      <div className="w-full relative bg-gray-100 dark:bg-gray-800">
        <div className="w-full aspect-[16/11] sm:aspect-[16/9] relative">
          <Image
            src={mainSrc}
            alt={listing.title || "Listing image"}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            priority={mainIndex === 0}
          />
        </div>

        {/* small counter if multiple images */}
        {urls && urls.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            {mainIndex + 1}/{urls.length}
          </div>
        )}

        {/* THUMBNAILS */}
        {urls && urls.length > 1 && (
          <div
            ref={thumbsRef}
            className="absolute left-3 right-3 -bottom-6 flex gap-2 overflow-x-auto py-2 px-1 scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            {urls.map((u, i) => (
              <button
                key={u + i}
                data-thumb-index={i}
                type="button"
                onClick={() => onThumbClick(i)}
                className={`shrink-0 rounded-md overflow-hidden transition ring-2 ring-transparent focus:outline-none ${
                  i === mainIndex
                    ? "ring-emerald-500"
                    : "hover:ring-gray-300 dark:hover:ring-gray-600"
                }`}
                aria-pressed={i === mainIndex}
                aria-label={`Показать изображение ${i + 1}`}
              >
                <div className="relative w-24 h-16 sm:w-28 sm:h-18">
                  <Image src={u} alt={`thumb-${i}`} fill className="object-cover" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="pt-8 p-4 space-y-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 text-lg">
          {listing.title}
        </h3>

        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 flex-1">
          {listing.description}
        </p>

        <div className="flex items-center justify-between pt-2">
          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
            {formatPrice(listing.price)}
          </span>
          <span className="text-sm text-gray-500 dark:text-blue-300">{listing.city}</span>
        </div>
      </div>
    </motion.div>
  );
}
