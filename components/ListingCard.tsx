"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useMemo, useState } from "react";
import { MapPin, ChevronLeft, ChevronRight, Heart } from "lucide-react";

// --- Вспомогательные функции ---

// Правильное склонение комнат: 1 комната, 2 комнаты, 5 комнат
const getRoomWord = (n: number) => {
  const lastDigit = n % 10;
  const lastTwoDigits = n % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "комнат";
  if (lastDigit === 1) return "комната";
  if (lastDigit >= 2 && lastDigit <= 4) return "комнаты";
  return "комнат";
};

const formatPrice = (n: number) => (n == null ? "" : `${Number(n).toLocaleString("ru-RU")} ₸`);

export default function ListingCard({ listing, onClick }: { listing: any, onClick: () => void }) {
  // Исправленный парсинг картинок
  const urls = useMemo(() => {
    const raw = listing.image_urls ?? listing.images ?? [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === "string") {
      return raw.replace(/[{} "\[\]]/g, "").split(",").filter(Boolean);
    }
    return [];
  }, [listing]);

  const [mainIndex, setMainIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMainIndex((prev) => (prev + 1 === urls.length ? 0 : prev + 1));
  };

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMainIndex((prev) => (prev === 0 ? urls.length - 1 : prev - 1));
  };

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 flex flex-col h-full"
    >
      {/* IMAGE SECTION */}
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={mainIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <Image
              src={urls[mainIndex] || "/no-image.png"}
              alt={listing.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>
        </AnimatePresence>

        {/* Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

        {/* Navigation Arrows (только при ховере) */}
        {urls.length > 1 && isHovered && (
          <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
            <button 
              onClick={prevImg}
              className="p-2 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-full transition-all active:scale-90"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={nextImg}
              className="p-2 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-full transition-all active:scale-90"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Like Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); /* Добавь логику избранного здесь */ }}
          className="absolute top-5 right-5 z-20 p-2.5 bg-white/10 backdrop-blur-lg hover:bg-red-500 rounded-full text-white transition-all group/heart active:scale-95"
        >
          <Heart size={20} className="group-hover/heart:fill-current" />
        </button>

        {/* Indicators (Dots) */}
        {urls.length > 1 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {urls.map((_: any, i: number) => (
              <div 
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === mainIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* CONTENT SECTION */}
      <div className="p-6 space-y-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-4">
          <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white line-clamp-1 flex-1 leading-tight">
            {listing.title}
          </h3>
          <div className="text-indigo-600 dark:text-indigo-400 font-black text-xl whitespace-nowrap">
            {formatPrice(listing.price)}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400">
          <MapPin size={16} className="text-indigo-500" />
          <span className="text-sm font-bold truncate uppercase tracking-wider">
            {listing.district || listing.city || "Алматы"}
          </span>
        </div>

        {/* Features / Badges (Soft Premium Style) */}
        <div className="pt-5 mt-auto flex flex-wrap gap-2 border-t border-gray-100 dark:border-slate-800">
          {/* Комнаты - исправлено! */}
          <div className="px-4 py-1.5 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border border-indigo-100/50 dark:border-indigo-900/30">
            {listing.rooms || 1} {getRoomWord(listing.rooms || 1)}
          </div>

          {/* Тип жилья - исправлено! */}
          <div className="px-4 py-1.5 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-xl text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest border border-emerald-100/50 dark:border-emerald-900/30">
            {listing.property_type === 'house' ? 'Дом' : 'Квартира'}
          </div>

          {/* Площадь */}
          {listing.area_total && (
             <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-100 dark:border-slate-800">
                {listing.area_total} м²
             </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}