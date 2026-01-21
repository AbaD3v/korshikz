"use client";

import React from "react";
import ListingCard from "./ListingCard"; // Убедись, что ListingCard тоже на Tailwind
import { useRouter } from "next/navigation";
import { Home, LayoutGrid } from "lucide-react";

interface UserListingsProps {
  listings: any[];
}
export default function UserListings({ listings }: UserListingsProps) {
  const router = useRouter();

  // Если объявлений нет, возвращаем null (ничего не рендерим)
  if (!listings || listings.length === 0) return null;

  return (
    <div className="mt-12 space-y-8 pt-12 border-t border-slate-100 dark:border-slate-800">
      {/* Заголовок теперь в стиле твоего нового дизайна */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Inventory</p>
          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
            Объявления
          </h3>
        </div>
        <div className="px-4 py-2 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl">
          {listings.length} ACTIVE
        </div>
      </div>

      {/* Grid с карточками */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
  {listings.map((l) => (
    <ListingCard 
      key={l.id} 
      listing={l} 
      onClick={() => router.push(`/listings/${l.id}`)} // Передаем напрямую в компонент
    />
  ))}
</div>
    </div>
  );
}