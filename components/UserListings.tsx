import React from "react";
import ListingCard from "./ListingCard";
import { useRouter } from "next/router";

interface UserListingsProps {
  listings: any[];
}

export default function UserListings({ listings }: UserListingsProps) {
  const router = useRouter();

  return (
    <div>
      {/* listings header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Объявления</h3>
            <div className="text-sm text-neutral-500">{listings.length} найдено</div>
          </div>

      {listings.length === 0 && (
        <div className="text-gray-500">У пользователя нет объявлений.</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((l) => (
          <ListingCard
            key={l.id}
            listing={l}
            onClick={() => router.push(`/listings/${l.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
