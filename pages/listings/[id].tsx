import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../hooks/utils/supabase/client";
import {
  ArrowLeft,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  User,
  Home,
  Wallet,
  Ruler,
  Building2,
  Sparkles,
  Moon,
  Sun,
  Cigarette,
  Dog,
  MessageSquare,
} from "lucide-react";

export default function ListingDetail() {
  const router = useRouter();

  const [listing, setListing] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  const formatPrice = (val: any) =>
    val == null || val === ""
      ? "Цена не указана"
      : new Intl.NumberFormat("ru-RU").format(Number(val)) + " ₸";

  const parseImageUrls = (raw: any) => {
    try {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw.filter(Boolean);
      if (typeof raw === "string") {
        const cleaned = raw
          .replace(/^\s*\{|\}\s*$/g, "")
          .replace(/["\[\]]/g, "");
        return cleaned
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  };

  const realId = useMemo(() => {
    const queryId = router.query.id;
    const pathId =
      typeof window !== "undefined"
        ? window.location.pathname.split("/").pop()
        : null;

    return queryId && queryId !== "[id]" ? queryId : pathId;
  }, [router.query.id]);

  useEffect(() => {
    if (!realId || realId === "[id]") return;

    let mounted = true;

    async function fetchData() {
      setLoading(true);

      try {
        const { data: listingData, error: lErr } = await supabase
          .from("listings")
          .select("*")
          .eq("id", realId)
          .single();

        if (lErr) throw lErr;

        if (!mounted || !listingData) return;

        setListing(listingData);

        const parsedImages = parseImageUrls(listingData.image_urls);
        setImages(parsedImages.length ? parsedImages : ["/no-image.png"]);

        if (listingData.user_id) {
          const { data: profileData, error: pErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", listingData.user_id)
            .single();

          if (pErr) throw pErr;

          if (!mounted) return;

          // people-first: не показываем жильё неподтвержденного пользователя
          if (profileData && !profileData.is_verified) {
            setListing(null);
            setOwner(null);
            return;
          }

          setOwner(profileData || null);
        }
      } catch (err: any) {
        console.error("Ошибка загрузки:", err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [realId]);

  const nextImage = () => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#020617]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!listing || !owner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#020617] px-6">
        <div className="text-center max-w-lg">
          <Home
            size={72}
            className="mx-auto text-slate-200 dark:text-slate-800 mb-6"
          />
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white mb-3">
            Объявление недоступно
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Возможно, оно удалено или профиль владельца ещё не подтверждён.
          </p>
          <button
            onClick={() => router.push("/listings")}
            className="mt-8 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all"
          >
            Вернуться к поиску
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pb-24 md:pb-10">
      <Head>
        <title>{listing.title || "Жильё"} — Korshi</title>
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-6">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-indigo-600 flex items-center gap-2 text-sm font-black transition-all"
        >
          <ArrowLeft size={18} /> НАЗАД
        </button>

        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* HERO */}
          <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-6">
            {/* ГАЛЕРЕЯ */}
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-4 shadow-xl border border-gray-100 dark:border-gray-800">
              <div className="relative h-[320px] sm:h-[520px] bg-gray-100 dark:bg-gray-800 rounded-[2rem] overflow-hidden">
                <img
                  src={images[activeIndex] || "/no-image.png"}
                  className="w-full h-full object-cover cursor-zoom-in"
                  alt={listing.title || "Property"}
                  onClick={() => setViewerOpen(true)}
                />

                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}

                <div className="absolute bottom-4 left-4 px-4 py-2 rounded-xl bg-black/45 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em]">
                  {activeIndex + 1} / {images.length}
                </div>
              </div>

              {images.length > 1 && (
                <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveIndex(index)}
                      className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                        activeIndex === index
                          ? "border-indigo-500"
                          : "border-transparent"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* SIDEBAR */}
            <div className="space-y-6">
              {/* Цена / локация / title */}
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-xl border border-gray-100 dark:border-gray-800 space-y-5">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">
                  Жильё
                </div>

                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white uppercase leading-tight">
                  {listing.title || "Без названия"}
                </h1>

                <div className="flex items-center gap-2 text-gray-500 font-bold">
                  <MapPin size={18} className="text-indigo-500 shrink-0" />
                  <span>{listing.address || owner?.preferred_location || "Адрес не указан"}</span>
                </div>

                <div className="text-4xl font-black text-indigo-600 tracking-tighter">
                  {formatPrice(listing.price)}
                </div>
              </div>

              {/* Владелец */}
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-xl border border-gray-100 dark:border-gray-800">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-4">
                  Кто ищет соседа
                </div>

                <Link
                  href={`/profile/${owner.id}`}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden border-4 border-indigo-50 dark:border-indigo-900/30 shadow-lg">
                    <img
                      src={owner?.avatar_url || "/default-avatar.png"}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      alt="Owner"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-xl font-black dark:text-white leading-none group-hover:text-indigo-600 transition-colors">
                        {owner?.full_name || "Пользователь"}
                      </div>
                      {owner?.is_verified && (
                        <ShieldCheck size={16} className="text-indigo-500" />
                      )}
                    </div>

                    <div className="text-indigo-500 font-bold mt-1 uppercase text-xs tracking-wider">
                      {owner?.university || "Студент"}
                    </div>

                    {(owner?.faculty || owner?.study_type) && (
                      <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {[owner?.faculty, owner?.study_type]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    )}
                  </div>
                </Link>

                {owner?.about_me && (
                  <p className="mt-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {owner.about_me}
                  </p>
                )}

                <div className="mt-6">
                  <button
                    onClick={() => owner?.id && router.push(`/chat/${owner.id}`)}
                    className="w-full px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl transition-all font-black text-xs uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={16} />
                    Написать
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* DETAILS GRID */}
          <section className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-6">
            {/* Левый блок */}
            <div className="space-y-6">
              {/* Характеристики жилья */}
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-gray-100 dark:border-gray-800">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-6">
                  Характеристики
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SpecCard
                    icon={<Home size={18} className="text-indigo-500" />}
                    label="Тип"
                    value={
                      listing.property_type === "house"
                        ? "Дом"
                        : listing.property_type === "apartment"
                        ? "Квартира"
                        : "Не указано"
                    }
                  />
                  <SpecCard
                    icon={<Wallet size={18} className="text-indigo-500" />}
                    label="Аренда"
                    value={
                      listing.rent_type === "daily"
                        ? "Посуточно"
                        : listing.rent_type === "long"
                        ? "Долгий срок"
                        : "Не указано"
                    }
                  />
                  <SpecCard
                    icon={<Building2 size={18} className="text-indigo-500" />}
                    label="Комнат"
                    value={listing.rooms ?? "—"}
                  />
                  <SpecCard
                    icon={<Ruler size={18} className="text-indigo-500" />}
                    label="Площадь"
                    value={listing.area_total ? `${listing.area_total} м²` : "—"}
                  />
                  <SpecCard
                    icon={<Building2 size={18} className="text-indigo-500" />}
                    label="Этаж"
                    value={listing.floor ?? "—"}
                  />
                  <SpecCard
                    icon={<Building2 size={18} className="text-indigo-500" />}
                    label="Всего этажей"
                    value={listing.floors_total ?? "—"}
                  />
                  <SpecCard
                    icon={<MapPin size={18} className="text-indigo-500" />}
                    label="Город"
                    value={listing.city || owner?.city || "—"}
                  />
                  <SpecCard
                    icon={<Wallet size={18} className="text-indigo-500" />}
                    label="Цена"
                    value={formatPrice(listing.price)}
                  />
                </div>
              </div>

              {/* Описание жилья */}
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-gray-100 dark:border-gray-800">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-4">
                  Описание жилья
                </div>

                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base md:text-lg font-medium whitespace-pre-wrap">
                  {listing.description || "Описание пока не добавлено."}
                </p>
              </div>
            </div>

            {/* Правый блок */}
            <div className="space-y-6">
              {/* Кого ищет */}
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-xl border border-gray-100 dark:border-gray-800">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-5">
                  Кого ищет
                </div>

                <div className="space-y-3">
                  <PreferenceRow
                    label="Пол"
                    value={
                      owner?.preferred_gender === "male"
                        ? "Парень"
                        : owner?.preferred_gender === "female"
                        ? "Девушка"
                        : "Не важно"
                    }
                  />
                  <PreferenceRow
                    label="Возраст"
                    value={
                      owner?.preferred_age_min && owner?.preferred_age_max
                        ? `${owner.preferred_age_min}–${owner.preferred_age_max}`
                        : "Не указано"
                    }
                  />
                  <PreferenceRow
                    label="Питомцы"
                    value={owner?.preferred_pets ? "Можно" : "Не желательно"}
                  />
                  <PreferenceRow
                    label="Курение"
                    value={owner?.preferred_smoking ? "Можно" : "Не желательно"}
                  />
                </div>
              </div>

              {/* Образ жизни */}
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-xl border border-gray-100 dark:border-gray-800">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-5">
                  Образ жизни
                </div>

                <div className="flex flex-wrap gap-2">
                  {owner?.schedule_type === "morning" && (
                    <LifestyleTag icon={<Sun size={13} />} text="Жаворонок" />
                  )}
                  {owner?.schedule_type === "evening" && (
                    <LifestyleTag icon={<Moon size={13} />} text="Сова" />
                  )}
                  {Number(owner?.cleanliness_level) > 3 && (
                    <LifestyleTag icon={<Sparkles size={13} />} text="Чистюля" />
                  )}
                  {owner?.preferred_pets && (
                    <LifestyleTag icon={<Dog size={13} />} text="Ок с питомцами" />
                  )}
                  {owner?.preferred_smoking && (
                    <LifestyleTag
                      icon={<Cigarette size={13} />}
                      text="Ок с курением"
                    />
                  )}
                  {owner?.faculty && (
                    <LifestyleTag
                      icon={<GraduationCap size={13} />}
                      text={owner.faculty}
                    />
                  )}
                  {owner?.age && (
                    <LifestyleTag icon={<User size={13} />} text={`${owner.age} лет`} />
                  )}
                </div>
              </div>
            </div>
          </section>
        </motion.main>
      </div>

      <AnimatePresence>
        {viewerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <button
              onClick={() => setViewerOpen(false)}
              className="absolute top-5 right-5 p-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              <X size={22} />
            </button>

            <div className="relative w-full max-w-6xl">
              <img
                src={images[activeIndex] || "/no-image.png"}
                className="w-full max-h-[85vh] object-contain rounded-[2rem]"
                alt="Fullscreen"
              />

              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-2xl bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all"
                  >
                    <ChevronLeft size={22} />
                  </button>

                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-2xl bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SpecCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: any;
}) {
  return (
    <div className="rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/40 p-4">
      <div className="flex items-center gap-2 mb-3">{icon}</div>
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">
        {value ?? "—"}
      </div>
    </div>
  );
}

function PreferenceRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="text-sm font-black text-slate-900 dark:text-white text-right">
        {value}
      </span>
    </div>
  );
}

function LifestyleTag({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 text-[10px] font-black uppercase tracking-wide">
      {icon}
      {text}
    </div>
  );
}