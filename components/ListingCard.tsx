"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  Sparkles,
  Moon,
  Sun,
  GraduationCap,
  CheckCircle2,
  ShieldCheck,
  Home,
  Users2,
  Wallet,
} from "lucide-react";

interface ListingCardProps {
  listing: any;
  onClick: () => void;
  isUniMatch?: boolean;
  matchScore?: number;
}

export default function ListingCard({
  listing: profile,
  onClick,
  isUniMatch,
  matchScore = 75,
}: ListingCardProps) {
  const actualListing = profile.listings?.[0] || null;
  const hasHousing = Boolean(actualListing);

  const displayPrice = actualListing?.price ?? profile?.budget ?? 0;

  const coverImage =
    profile?.avatar_url ||
    actualListing?.image_urls?.[0] ||
    actualListing?.image_url ||
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267";

  const personTitle =
    profile?.full_name ||
    profile?.username ||
    "Студент";

  const personSubtitle = [
    profile?.age ? `${profile.age} лет` : null,
    profile?.faculty || null,
    profile?.study_type || null,
  ]
    .filter(Boolean)
    .join(" • ");

  const locationText =
    profile?.preferred_location ||
    actualListing?.address ||
    profile?.city?.name ||
    "Локация не указана";

  const situationLabel = getSituationLabel(profile?.status);
  const compatibilityLabel = isUniMatch
    ? "ВАШ СОКУРСНИК"
    : `ПОДХОДИТ НА ${matchScore}%`;

  return (
    <motion.div
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`group cursor-pointer bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 ${
        isUniMatch
          ? "border-indigo-500/30 dark:border-indigo-500/30"
          : "border-slate-100 dark:border-slate-800"
      }`}
    >
      {/* HERO */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={coverImage}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          alt={personTitle}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/25 to-transparent" />

        {/* Верхняя панель */}
        <div className="absolute top-5 left-5 right-5 flex justify-between items-start gap-3 z-10">
          <div className="flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 pr-4 rounded-2xl shadow-xl max-w-[70%]">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white overflow-hidden border-2 border-white dark:border-slate-800 shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  className="w-full h-full object-cover"
                  alt=""
                />
              ) : (
                <span className="text-xs font-black">
                  {personTitle?.charAt(0)}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black text-slate-900 dark:text-white leading-none truncate">
                  {personTitle}
                </p>

                {profile?.is_verified && (
                  <ShieldCheck size={11} className="text-indigo-500 shrink-0" />
                )}

                {isUniMatch && (
                  <CheckCircle2 size={10} className="text-indigo-500 shrink-0" />
                )}
              </div>

              <p
                className={`text-[8px] font-bold uppercase tracking-wider truncate ${
                  isUniMatch ? "text-indigo-500" : "text-slate-400"
                }`}
              >
                {profile?.university?.name || "ВУЗ не указан"}
              </p>
            </div>
          </div>

          <div
            className={`px-4 py-2 rounded-xl text-[10px] font-black italic shadow-lg transition-colors shrink-0 ${
              isUniMatch
                ? "bg-indigo-600 text-white shadow-indigo-500/40"
                : "bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700"
            }`}
          >
            {compatibilityLabel}
          </div>
        </div>

        {/* Низ hero */}
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <div className="flex flex-wrap gap-2 mb-3">
            <TopPill
              icon={<Users2 size={12} />}
              text={situationLabel}
              tone="dark"
            />

            {hasHousing && (
              <TopPill
                icon={<Home size={12} />}
                text="Есть жильё"
                tone="indigo"
              />
            )}

            {profile?.is_verified && (
              <TopPill
                icon={<ShieldCheck size={12} />}
                text="Подтверждён"
                tone="light"
              />
            )}
          </div>

          <h3 className="text-3xl font-black italic tracking-tighter text-white leading-none">
            {personTitle}
          </h3>

          {personSubtitle ? (
            <p className="mt-2 text-white/80 text-sm font-bold line-clamp-1">
              {personSubtitle}
            </p>
          ) : null}
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-6 space-y-5">
        {/* Локация и бюджет */}
        <div className="grid grid-cols-1 gap-3">
          <InfoRow
            icon={<MapPin size={15} className="text-indigo-500" />}
            label="Локация"
            value={locationText}
          />

          <InfoRow
            icon={<Wallet size={15} className="text-indigo-500" />}
            label={hasHousing ? "Цена / место" : "Бюджет в месяц"}
            value={`${Number(displayPrice || 0).toLocaleString("ru-RU")} ₸`}
          />
        </div>

        {/* Теги */}
        <div className="flex flex-wrap gap-2 pt-1">
          {profile?.schedule_type === "morning" && (
            <Tag icon={<Sun size={12} />} text="Жаворонок" color="amber" />
          )}

          {profile?.schedule_type === "evening" && (
            <Tag icon={<Moon size={12} />} text="Сова" color="indigo" />
          )}

          {Number(profile?.cleanliness_level) > 3 && (
            <Tag icon={<Sparkles size={12} />} text="Чистюля" color="emerald" />
          )}

          <Tag
            icon={<GraduationCap size={12} />}
            text={profile?.faculty || "Студент"}
            color="slate"
          />
        </div>

        {/* Secondary housing block */}
        {hasHousing ? (
          <div className="rounded-[1.75rem] border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Home size={14} className="text-indigo-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                Жильё
              </span>
            </div>

            <h4 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">
              {actualListing?.title || "Карточка жилья добавлена"}
            </h4>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {actualListing?.description ||
                "У этого пользователя есть жильё или свободное место. Открой профиль, чтобы посмотреть детали."}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {actualListing?.rooms ? (
                <MiniTag text={`${actualListing.rooms} комн.`} />
              ) : null}

              {actualListing?.area_total ? (
                <MiniTag text={`${actualListing.area_total} м²`} />
              ) : null}

              {actualListing?.floor && actualListing?.floors_total ? (
                <MiniTag text={`${actualListing.floor}/${actualListing.floors_total} этаж`} />
              ) : null}

              {actualListing?.rent_type ? (
                <MiniTag
                  text={
                    actualListing.rent_type === "daily"
                      ? "Посуточно"
                      : "Долгий срок"
                  }
                />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users2 size={14} className="text-indigo-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                Формат поиска
              </span>
            </div>

            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {getSearchMessage(profile?.status)}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {label}
        </div>
        <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
          {value}
        </div>
      </div>
    </div>
  );
}

function TopPill({
  icon,
  text,
  tone,
}: {
  icon: React.ReactNode;
  text: string;
  tone: "dark" | "indigo" | "light";
}) {
  const tones = {
    dark: "bg-black/35 text-white border border-white/10 backdrop-blur-md",
    indigo: "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30",
    light: "bg-white/90 text-slate-900 border border-white/30",
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${tones[tone]}`}
    >
      {icon}
      {text}
    </div>
  );
}

function Tag({
  icon,
  text,
  color,
}: {
  icon: any;
  text: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10",
    slate: "bg-slate-50 text-slate-600 dark:bg-slate-500/10",
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${
        colors[color] || colors.slate
      }`}
    >
      {icon} {text}
    </div>
  );
}

function MiniTag({ text }: { text: string }) {
  return (
    <div className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-300">
      {text}
    </div>
  );
}

function getSituationLabel(status?: string | null) {
  switch (status) {
    case "searching":
      return "Ищет соседа";
    case "have_flat":
      return "Ищет к себе";
    case "free_spot":
      return "Есть место";
    case "inactive":
      return "Неактивен";
    default:
      return "В поиске";
  }
}

function getSearchMessage(status?: string | null) {
  switch (status) {
    case "searching":
      return "Сейчас ищет соседа и подходящий вариант жилья.";
    case "have_flat":
      return "Указывает, что жильё есть, но карточка жилья пока не заполнена.";
    case "free_spot":
      return "Похоже, у пользователя есть свободное место, но детали жилья ещё не добавлены.";
    default:
      return "Открой профиль, чтобы узнать больше о сценарии поиска.";
  }
}
