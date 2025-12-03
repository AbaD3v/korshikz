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
} from "lucide-react";

// ---------------- TYPES ----------------
export type Profile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;

  // информация
  about_me?: string | null;
  bio?: string | null;
  birthday?: string | null;

  // учеба
  university?: string | null;
  faculty?: string | null;
  course?: number | null;
  study_type?: string | null;

  // город
  city?: string | null;

  // предпочтения
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

  // личные параметры
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
    <div className={`bg-white rounded-2xl border shadow-sm p-6 ${className}`}>
      {children}
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-neutral-600">{label}</span>
      <span className="font-medium text-neutral-800 text-right">{children}</span>
    </div>
  );
}

// --------------- SUBCOMPONENTS ----------------

function ProfileHeader({ profile, isOwner, listingsCount, onEdit }: any) {
  return (
    <Card>
      <div className="flex gap-4">
<div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-neutral-100">

  {profile.avatar_url ? (
    <Image
      src={profile.avatar_url}
      alt={profile.full_name ?? "avatar"}
      fill
      className="object-cover"
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-neutral-400">
      <User size={40} />
    </div>
  )}

  {isOwner && (
    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-full px-2">
      <AvatarUploader 
        userId={profile.id}
        initialUrl={profile.avatar_url}
      />
    </div>
  )}

</div>



        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{profile.full_name}</h1>

          <div className="mt-2 flex flex-col gap-1 text-neutral-600 text-sm">
            {profile.city && (
              <span className="flex items-center gap-2">
                <MapPin size={14} />
                {profile.city}
              </span>
            )}

            {profile.university && (
              <span className="flex items-center gap-2">
                <Book size={14} />
                {profile.university}
                {profile.faculty ? `, ${profile.faculty}` : ""}
                {profile.course ? ` • ${profile.course} курс` : ""}
              </span>
            )}

            <span className="flex items-center gap-2">
              <User size={14} />
              {listingsCount} объявлений
            </span>
          </div>

          {isOwner && (
            <button
              onClick={onEdit}
              className="mt-3 px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm"
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
      <h3 className="text-lg font-semibold mb-3 flex gap-2 items-center">
        <Info size={16} /> О себе
      </h3>

      <div className="text-sm text-neutral-700">
        {profile.about_me || profile.bio || "Пользователь ещё не рассказал о себе."}
      </div>

      <div className="mt-4 text-sm text-neutral-600 space-y-2">
        {profile.birthday && (
          <div className="flex gap-2 items-center">
            <Calendar size={14} /> День рождения: {profile.birthday}
          </div>
        )}

        {profile.introvert_extrovert && (
          <div className="flex gap-2 items-center">
            <Heart size={14} /> Тип личности: {profile.introvert_extrovert}
          </div>
        )}

        {profile.lifestyle && (
          <div className="flex gap-2 items-center">
            <Home size={14} /> Стиль жизни: {profile.lifestyle}
          </div>
        )}
      </div>
    </Card>
  );
}

function PreferencesCard({ profile }: any) {
  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">Предпочтения</h3>

      <Field label="Тип жилья">{profile.room_type ?? "—"}</Field>
      <Field label="Локация">{profile.preferred_location ?? "—"}</Field>

      <Field label="Бюджет">
        {money(profile.budget_min)} — {money(profile.budget_max)}
      </Field>

      <Field label="Пол соседа">{profile.preferred_gender ?? "Не важно"}</Field>

      <Field label="Возраст">
        {profile.preferred_age_min ?? "—"} —{" "}
        {profile.preferred_age_max ?? "—"}
      </Field>

      <Field label="С животными?">
        {profile.preferred_pets ? "Да" : "Нет"}
      </Field>

      <Field label="Курение?">
        {profile.preferred_smoking ? "Да" : "Нет"}
      </Field>

      <Field label="Нужна мебель?">
        {profile.need_furnished ? "Да" : "Нет"}
      </Field>
    </Card>
  );
}

function LifestyleCard({ profile }: any) {
  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">Образ жизни</h3>

      <Field label="Подъём">{profile.wake_time ?? "—"}</Field>
      <Field label="Сон">{profile.sleep_time ?? "—"}</Field>
      <Field label="Уровень шума">{profile.noise_tolerance ?? "—"}</Field>
      <Field label="Чистоплотность">{profile.cleanliness_level ?? "—"}</Field>
    </Card>
  );
}

function HobbiesCard({ profile }: any) {
  return (
    <Card>
      <h3 className="text-lg font-semibold mb-3">Интересы</h3>

      {profile.hobbies?.length ? (
        <div className="flex flex-wrap gap-2">
          {profile.hobbies.map((h: string) => (
            <span
              key={h}
              className="px-3 py-1 bg-neutral-100 border rounded-xl text-sm"
            >
              {h}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-neutral-500 text-sm">Интересы не указаны</div>
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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
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
