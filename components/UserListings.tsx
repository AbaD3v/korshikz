"use client";

import React from "react";
import { useRouter } from "next/router";
import {
  Home,
  MapPin,
  Wallet,
  Building2,
  Ruler,
  ChevronRight,
} from "lucide-react";

interface UserListingsProps {
  listings: any[];
}

export default function UserListings({ listings }: UserListingsProps) {
  const router = useRouter();

  if (!listings || listings.length === 0) return null;

  return (
    <div
      id="housing"
      className="mt-12 space-y-8 pt-12 border-t border-slate-100 dark:border-slate-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">
            Housing
          </p>
          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
            <Home size={24} className="text-indigo-500" />
            Жильё
          </h3>
        </div>

        <div className="px-4 py-2 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl">
          {listings.length} {listings.length === 1 ? "OBJECT" : "OBJECTS"}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {listings.map((listing) => (
          <HousingCard
            key={listing.id}
            listing={listing}
            onClick={() => router.push(`/listings/${listing.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function HousingCard({
  listing,
  onClick,
}: {
  listing: any;
  onClick: () => void;
}) {
  const cover =
    listing?.image_urls?.[0] ||
    listing?.image_url ||
    "/no-image.png";

  const price =
    listing?.price !== null && listing?.price !== undefined
      ? `${Number(listing.price).toLocaleString("ru-RU")} ₸`
      : "Цена не указана";

  const location =
    listing?.address || listing?.city || "Локация не указана";

  const rentType =
    listing?.rent_type === "daily"
      ? "Посуточно"
      : listing?.rent_type === "long"
      ? "Долгий срок"
      : "Не указано";

  const propertyType =
    listing?.property_type === "house"
      ? "Дом"
      : listing?.property_type === "apartment"
      ? "Квартира"
      : "Жильё";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={cover}
          alt={listing?.title || "Жильё"}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/10 to-transparent" />

        <div className="absolute top-5 left-5 flex flex-wrap gap-2">
          <TopBadge text={propertyType} />
          {listing?.status === "active" && <TopBadge text="Активно" tone="indigo" />}
        </div>

        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">
              Цена
            </p>
            <p className="text-2xl md:text-3xl font-black italic tracking-tighter text-white">
              {price}
            </p>
          </div>

          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/15 group-hover:bg-indigo-600 transition-colors shrink-0">
            <ChevronRight size={18} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-5">
        <div>
          <h4 className="text-xl font-black tracking-tight text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-500 transition-colors">
            {listing?.title || "Карточка жилья"}
          </h4>

          <div className="mt-2 flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-bold">
            <MapPin size={15} className="text-indigo-500 shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>
        </div>

        {listing?.description ? (
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3">
            {listing.description}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-slate-400 line-clamp-2">
            Описание жилья пока не добавлено.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <InfoChip
            icon={<Wallet size={12} />}
            text={rentType}
          />

          {listing?.rooms ? (
            <InfoChip
              icon={<Building2 size={12} />}
              text={`${listing.rooms} комн.`}
            />
          ) : null}

          {listing?.area_total ? (
            <InfoChip
              icon={<Ruler size={12} />}
              text={`${listing.area_total} м²`}
            />
          ) : null}

          {listing?.floor && listing?.floors_total ? (
            <InfoChip
              icon={<Building2 size={12} />}
              text={`${listing.floor}/${listing.floors_total} этаж`}
            />
          ) : null}
        </div>
      </div>
    </button>
  );
}

function TopBadge({
  text,
  tone = "light",
}: {
  text: string;
  tone?: "light" | "indigo";
}) {
  const styles =
    tone === "indigo"
      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
      : "bg-white/90 text-slate-900 border border-white/30";

  return (
    <div
      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider backdrop-blur-md ${styles}`}
    >
      {text}
    </div>
  );
}

function InfoChip({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 text-[10px] font-black uppercase tracking-wide">
      {icon}
      {text}
    </div>
  );
}