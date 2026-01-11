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

  return (
    <div className="mt-8 space-y-6">
      {/* Listings Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
            <LayoutGrid size={20} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Объявления
          </h3>
        </div>
        <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {listings.length} {listings.length === 1 ? 'объявление' : 'найдено'}
        </div>
      </div>

      {/* Empty State */}
      {listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-800">
          <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex items-center justify-center mb-4 text-gray-300">
            <Home size={32} />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-center">
            У этого пользователя пока нет активных объявлений.
          </p>
        </div>
      ) : (
        /* Listings Grid */
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
  {listings.map((l) => (
    <div 
      key={l.id} 
      className="transform transition-all duration-300 hover:-translate-y-2 active:scale-[0.98]"
    >
      <ListingCard
        listing={l}
        onClick={() => router.push(`/listings/${l.id}`)} // Передаем обязательный пропс
      />
    </div>
  ))}
</div>
      )}
    </div>
  );
}