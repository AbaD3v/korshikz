"use client";

import React from "react";
import Image from "next/image";
import AvatarUploader from "../components/AvatarUploader";

import {
  Mail,
  Phone,
  MapPin,
  Book,
  Home,
  Heart,
  CheckCircle,
  User,
  Info,
  Calendar,
  PawPrint,
  Cigarette,
  Sparkles,
  Zap
} from "lucide-react";

// ---------------- TYPES ----------------
export type Profile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  about_me?: string | null;
  bio?: string | null;
  birthday?: string | null;
  university?: string | null;
  faculty?: string | null;
  course?: number | null;
  study_type?: string | null;
  city?: string | null;
  room_type?: string | null;
  preferred_location?: string | null;
  preferred_gender?: string | null;
  preferred_age_min?: number | null;
  preferred_age_max?: number | null;
  preferred_pets?: boolean | null;
  preferred_smoking?: boolean | null;
  budget_min?: number | null;
  budget_max?: number | null;
  need_furnished?: boolean | null;
  wake_time?: string | null;
  sleep_time?: string | null;
  noise_tolerance?: number | null;
  cleanliness_level?: number | null;
  introvert_extrovert?: string | null;
  lifestyle?: string | null;
  pets?: boolean | null;
  smoking?: boolean | null;
  hobbies?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type Listing = {
  id: string | number;
  title?: string | null;
  price?: number | null;
  description?: string | null;
  city?: string | null;
  bedrooms?: number | null;
  images?: string[] | null;
  created_at?: string | null;
};

// --------------- HELPERS ----------------
const money = (n?: number | null) =>
  n == null ? "—" : `${n.toLocaleString()} ₸`;

function Card({ children, className = "" }: any) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm p-6 transition-colors duration-300 ${className}`}>
      {children}
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div className="flex justify-between items-center text-sm py-2 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
      <span className="text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      <span className="font-bold text-gray-900 dark:text-gray-100 text-right">{children}</span>
    </div>
  );
}

// --------------- SUBCOMPONENTS ----------------

function ProfileHeader({ profile, isOwner, listingsCount, onEdit }: any) {
  return (
    <Card className="relative overflow-hidden">
      {/* Декоративный градиент на фоне */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full" />
      
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start relative z-10">
        <div className="relative w-32 h-32 rounded-[2.5rem] overflow-hidden bg-gray-100 dark:bg-gray-800 ring-4 ring-white dark:ring-gray-900 shadow-xl">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name ?? "avatar"}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
              <User size={48} />
            </div>
          )}

          {isOwner && (
            <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <AvatarUploader 
                userId={profile.id}
                initialUrl={profile.avatar_url}
              />
            </div>
          )}
        </div>

        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            {profile.full_name || "Имя не указано"}
          </h1>

          <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-4 text-gray-500 dark:text-gray-400 text-sm font-medium">
            {profile.city && (
              <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full">
                <MapPin size={14} className="text-indigo-500" />
                {profile.city}
              </span>
            )}

            {profile.university && (
              <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full">
                <Book size={14} className="text-blue-500" />
                {profile.university}
                {profile.course ? ` • ${profile.course} курс` : ""}
              </span>
            )}

            <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full">
              <Sparkles size={14} className="text-amber-500" />
              {listingsCount} объявлений
            </span>
          </div>

          {isOwner && (
            <button
              onClick={onEdit}
              className="mt-6 px-6 py-2.5 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold shadow-lg hover:opacity-90 transition-all active:scale-95"
            >
              Редактировать профиль
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

function AboutCard({ profile }: any) {
  return (
    <Card>
      <h3 className="text-lg font-black mb-4 flex gap-2 items-center text-gray-900 dark:text-white">
        <Info size={20} className="text-indigo-500" /> О себе
      </h3>

      <div className="text-gray-700 dark:text-gray-300 leading-relaxed bg-indigo-50/30 dark:bg-indigo-500/5 p-4 rounded-2xl border border-indigo-50/50 dark:border-indigo-500/10">
        {profile.about_me || profile.bio || "Пользователь ещё не рассказал о себе."}
      </div>

      <div className="mt-6 space-y-3">
        {profile.birthday && (
          <div className="flex gap-3 items-center text-sm font-medium text-gray-600 dark:text-gray-400">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><Calendar size={16} /></div>
            Дата рождения: <span className="text-gray-900 dark:text-white ml-auto">{profile.birthday}</span>
          </div>
        )}

        {profile.introvert_extrovert && (
          <div className="flex gap-3 items-center text-sm font-medium text-gray-600 dark:text-gray-400">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><Heart size={16} /></div>
            Тип личности: <span className="text-gray-900 dark:text-white ml-auto">{profile.introvert_extrovert}</span>
          </div>
        )}

        {profile.lifestyle && (
          <div className="flex gap-3 items-center text-sm font-medium text-gray-600 dark:text-gray-400">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><Home size={16} /></div>
            Стиль жизни: <span className="text-gray-900 dark:text-white ml-auto">{profile.lifestyle}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function PreferencesCard({ profile }: any) {
  return (
    <Card>
      <h3 className="text-lg font-black mb-5 text-gray-900 dark:text-white">Предпочтения</h3>
      <div className="space-y-1">
        <Field label="Тип жилья">{profile.room_type ?? "—"}</Field>
        <Field label="Локация">{profile.preferred_location ?? "—"}</Field>
        <Field label="Бюджет">
          <span className="text-indigo-600 dark:text-indigo-400">
            {money(profile.budget_min)} — {money(profile.budget_max)}
          </span>
        </Field>
        <Field label="Пол соседа">{profile.preferred_gender ?? "Не важно"}</Field>
        <Field label="Возраст">
          {profile.preferred_age_min ?? "—"} — {profile.preferred_age_max ?? "—"}
        </Field>
        <Field label="С животными?">
          {profile.preferred_pets ? 
            <span className="text-green-600 dark:text-green-400">Да</span> : 
            <span className="text-gray-400">Нет</span>}
        </Field>
        <Field label="Нужна мебель?">
          {profile.need_furnished ? "Да" : "Нет"}
        </Field>
      </div>
    </Card>
  );
}

function LifestyleCard({ profile }: any) {
  return (
    <Card>
      <h3 className="text-lg font-black mb-5 text-gray-900 dark:text-white flex items-center gap-2">
        <Zap size={20} className="text-amber-500" /> Образ жизни
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
          <p className="text-xs text-gray-500 mb-1">Подъём</p>
          <p className="font-bold dark:text-white">{profile.wake_time ?? "—"}</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
          <p className="text-xs text-gray-500 mb-1">Сон</p>
          <p className="font-bold dark:text-white">{profile.sleep_time ?? "—"}</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
          <p className="text-xs text-gray-500 mb-1">Шум</p>
          <p className="font-bold dark:text-white">{profile.noise_tolerance ?? "—"}/5</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
          <p className="text-xs text-gray-500 mb-1">Чистота</p>
          <p className="font-bold dark:text-white">{profile.cleanliness_level ?? "—"}/5</p>
        </div>
      </div>
    </Card>
  );
}

function HobbiesCard({ profile }: any) {
  // Обработка если hobbies это строка (из Supabase иногда приходит строкой)
  const hobbiesList = Array.isArray(profile.hobbies) 
    ? profile.hobbies 
    : profile.hobbies?.split(',').map((h: string) => h.trim()).filter(Boolean);

  return (
    <Card>
      <h3 className="text-lg font-black mb-4 text-gray-900 dark:text-white">Интересы</h3>
      {hobbiesList?.length ? (
        <div className="flex flex-wrap gap-2">
          {hobbiesList.map((h: string) => (
            <span
              key={h}
              className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-sm font-bold"
            >
              {h}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-gray-400 dark:text-gray-600 text-sm italic py-4">Интересы не указаны</div>
      )}
    </Card>
  );
}

// --------------- MAIN COMPONENT --------------------

export default function UserProfile({
  profile,
  listings,
  isOwner,
  onProfileUpdated,
}: {
  profile: Profile;
  listings: Listing[];
  isOwner: boolean;
  onProfileUpdated: () => void;
}) {
  return (
    <div className="space-y-6">
      <ProfileHeader
        profile={profile}
        isOwner={isOwner}
        listingsCount={listings.length}
        onEdit={onProfileUpdated}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AboutCard profile={profile} />
        <PreferencesCard profile={profile} />
        <LifestyleCard profile={profile} />
        <HobbiesCard profile={profile} />
      </div>
    </div>
  );
}