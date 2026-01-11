"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useMemo, useState } from "react";
import { MapPin, ChevronLeft, ChevronRight, Heart } from "lucide-react";

const formatPrice = (n: number) => (n == null ? "" : `${Number(n).toLocaleString("ru-RU")} ₸`);

export default function ListingCard({ listing, onClick }: { listing: any, onClick: () => void }) {
  const urls = useMemo(() => listing.image_urls ?? listing.images ?? [], [listing]);
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
              src={urls[mainIndex] || "/placeholder.png"}
              alt={listing.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </motion.div>
        </AnimatePresence>

        {/* Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent opacity-40" />

        {/* Navigation Arrows (Show only on hover) */}
        {urls.length > 1 && isHovered && (
          <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
            <button 
              onClick={prevImg}
              className="p-2 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-full transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={nextImg}
              className="p-2 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-full transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Like Button */}
        <button className="absolute top-5 right-5 z-20 p-2.5 bg-white/10 backdrop-blur-lg hover:bg-red-500 rounded-full text-white transition-all group/heart">
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
      <div className="p-6 space-y-3 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1 flex-1 leading-tight">
            {listing.title}
          </h3>
          <div className="text-indigo-600 dark:text-indigo-400 font-black text-xl whitespace-nowrap">
            {formatPrice(listing.price)}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400">
          <MapPin size={16} className="text-indigo-500" />
          <span className="text-sm font-medium truncate">{listing.city || listing.address || "Алматы"}</span>
        </div>

        <p className="text-gray-600 dark:text-slate-400 text-sm line-clamp-2 leading-relaxed">
          {listing.description}
        </p>

        {/* Features / Badges */}
        <div className="pt-4 mt-auto flex items-center gap-3 border-t border-gray-100 dark:border-slate-800">
          <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider">
            {listing.rooms_count || 1} комната
          </div>
          <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider">
            {listing.type === 'room' ? 'Подселение' : 'Квартира'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}