"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import {
  Loader2,
  Upload,
  CheckCircle,
  AlertCircle,
  X,
  MapPin,
  ChevronRight,
  Info,
  Search,
  Link as LinkIcon,
  ShieldCheck,
  Home,
  Users2,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { sanitizeFileName } from "@/lib/sanitizeFileName";

// Динамический импорт карты
const ListingMap = dynamic(() => import("@/components/ListingMap"), {
  ssr: false,
  loading: () => (
    <div className="h-80 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[3rem]" />
  ),
});

type ProfileAccessData = {
  id: string;
  full_name?: string | null;
  status?: string | null;
  is_verified?: boolean | null;
  verification_status?: string | null;
  isOnboarded?: boolean | null;
  city_id?: string | null;
  university_id?: string | null;
  city?: { name: string } | null;
  university?: { name: string } | null;
};

type GalleryItem = {
  id: string;
  src: string;
  kind: "local" | "remote";
  file?: File;
};

const makeItemId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const parsePoint = (
  value: string | null | undefined
): { lat: number | null; lng: number | null } => {
  if (!value || typeof value !== "string") return { lat: null, lng: null };

  const match = value.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i);
  if (!match) return { lat: null, lng: null };

  return {
    lng: Number(match[1]),
    lat: Number(match[2]),
  };
};

const pickRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

export default function CreateListingPage({
  city: globalCity,
}: {
  city: string;
}) {
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(undefined);
  const [profile, setProfile] = useState<ProfileAccessData | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [krishaUrl, setKrishaUrl] = useState("");

  const [existingListingId, setExistingListingId] = useState<string | number | null>(
    null
  );

  const [formData, setFormData] = useState<any>({
    title: "",
    description: "",
    price: "",
    city: globalCity || "Астана",
    address: "",
    property_type: "apartment",
    rent_type: "long",
    rooms: "",
    area_total: "",
    floor: "",
    floors_total: "",
    lat: null,
    lng: null,
  });

  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  const canCreateHousingByStatus =
    profile?.status === "have_flat" || profile?.status === "free_spot";

  useEffect(() => {
    setIsMounted(true);

    const fetchUserAndData = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        setUser(authUser || null);

        if (!authUser) {
          setCheckingAccess(false);
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, full_name, status, is_verified, verification_status, isOnboarded, city_id, university_id, city:cities(name), university:universities(name)"
          )
          .eq("id", authUser.id)
          .maybeSingle();

        if (profileError) throw profileError;

        const normalizedProfile = profileData
          ? {
              ...(profileData as any),
              city: pickRelation((profileData as any).city),
              university: pickRelation((profileData as any).university),
            }
          : null;

        setProfile(normalizedProfile);

        if (normalizedProfile?.city?.name) {
          setFormData((prev: any) => ({
            ...prev,
            city: normalizedProfile.city?.name || prev.city,
          }));
        }

        const { data: latestListing, error: listingError } = await supabase
          .from("listings")
          .select("*")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (listingError) throw listingError;

        if (latestListing) {
          const point =
            latestListing.coordinates && (!latestListing.lat || !latestListing.lng)
              ? parsePoint(latestListing.coordinates)
              : { lat: null, lng: null };

          setExistingListingId(latestListing.id);

          setFormData((prev: any) => ({
            ...prev,
            title: latestListing.title || "",
            description: latestListing.description || "",
            price:
              latestListing.price !== null && latestListing.price !== undefined
                ? String(latestListing.price)
                : "",
            address: latestListing.address || "",
            property_type: latestListing.property_type || "apartment",
            rent_type: latestListing.rent_type || "long",
            rooms:
              latestListing.rooms !== null && latestListing.rooms !== undefined
                ? String(latestListing.rooms)
                : "",
            area_total:
              latestListing.area_total !== null &&
              latestListing.area_total !== undefined
                ? String(latestListing.area_total)
                : "",
            floor:
              latestListing.floor !== null && latestListing.floor !== undefined
                ? String(latestListing.floor)
                : "",
            floors_total:
              latestListing.floors_total !== null &&
              latestListing.floors_total !== undefined
                ? String(latestListing.floors_total)
                : "",
            lat: latestListing.lat ?? point.lat,
            lng: latestListing.lng ?? point.lng,
          }));

          const remoteImages = Array.isArray(latestListing.image_urls)
            ? latestListing.image_urls
            : [];

          setGallery(
            remoteImages.map((src: string) => ({
              id: makeItemId(),
              src,
              kind: "remote" as const,
            }))
          );
        }
      } catch (err: any) {
        console.error("Create listing init error:", err);
        setError(err.message || "Ошибка загрузки страницы");
      } finally {
        setCheckingAccess(false);
      }
    };

    fetchUserAndData();
  }, [globalCity]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleImportFromKrisha = async () => {
    if (!krishaUrl) return;

    setImporting(true);
    setError("");

    try {
      const res = await fetch("/api/import-krisha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: krishaUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка импорта");

      setFormData((prev: any) => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        price:
          data.price !== undefined && data.price !== null
            ? String(data.price)
            : prev.price,
        address: data.address || prev.address,
        rooms:
          data.rooms !== undefined && data.rooms !== null
            ? String(data.rooms)
            : prev.rooms,
        area_total:
          data.area_total !== undefined && data.area_total !== null
            ? String(data.area_total)
            : prev.area_total,
        floor:
          data.floor !== undefined && data.floor !== null
            ? String(data.floor)
            : prev.floor,
        floors_total:
          data.floors_total !== undefined && data.floors_total !== null
            ? String(data.floors_total)
            : prev.floors_total,
      }));

      if (Array.isArray(data.images)) {
        setGallery((prev) => {
          const localItems = prev.filter((item) => item.kind === "local");
          const remoteItems = data.images.map((src: string) => ({
            id: makeItemId(),
            src,
            kind: "remote" as const,
          }));
          return [...remoteItems, ...localItems];
        });
      }

      if (data.address) {
        setTimeout(() => {
          handleFindOnMap(data.address, profile?.city?.name || formData.city);
        }, 500);
      }
    } catch (err: any) {
      setError("Ошибка импорта: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleFindOnMap = async (addr?: string, cty?: string) => {
    const targetAddress = addr || formData.address;
    const targetCity = cty || profile?.city?.name || formData.city;

    if (!targetAddress) return;

    try {
      const fullAddress = `${targetCity}, ${targetAddress}`;
      const res = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${
          process.env.NEXT_PUBLIC_YANDEX_API_KEY
        }&format=json&geocode=${encodeURIComponent(fullAddress)}`
      );
      const data = await res.json();
      const pos =
        data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point
          ?.pos;

      if (pos) {
        const [lng, lat] = pos.split(" ").map(Number);
        setFormData((prev: any) => ({ ...prev, lat, lng }));
      } else {
        setError("Не удалось найти адрес на карте");
      }
    } catch (err) {
      console.error("Geocoding error", err);
      setError("Ошибка геокодирования адреса");
    }
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const newItems: GalleryItem[] = files.map((file) => ({
      id: makeItemId(),
      src: URL.createObjectURL(file),
      file,
      kind: "local",
    }));

    setGallery((prev) => [...prev, ...newItems]);
  };

  const removeGalleryItem = (itemId: string) => {
    setGallery((prev) => prev.filter((item) => item.id !== itemId));
  };

  const uploadLocalImages = async () => {
    if (!user?.id) throw new Error("Сначала войдите в аккаунт");

    const localItems = gallery.filter(
      (item) => item.kind === "local" && item.file
    );

    if (localItems.length === 0) return [];

    const urls: string[] = [];

    for (let i = 0; i < localItems.length; i++) {
      const item = localItems[i];
      const file = item.file!;
      const fileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("listings")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("listings").getPublicUrl(filePath);
      urls.push(data.publicUrl);
      setProgress(Math.round(((i + 1) / localItems.length) * 100));
    }

    return urls;
  };

  const ensureCanCreateListing = () => {
    if (!user?.id) {
      setError("Сначала войдите в систему");
      return false;
    }

    if (!profile?.isOnboarded) {
      setError("Сначала завершите онбординг");
      return false;
    }

    if (!profile?.is_verified) {
      if (profile?.verification_status === "pending") {
        setError(
          "Верификация уже на проверке. После одобрения можно будет добавить жильё."
        );
      } else {
        setError(
          "Добавлять жильё могут только подтвержденные студенты."
        );
      }
      return false;
    }

    if (!canCreateHousingByStatus) {
      setError(
        "Сейчас твой профиль не предполагает публикацию жилья. Для начала укажи, что у тебя есть квартира или место."
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setProgress(0);

    const ok = ensureCanCreateListing();
    if (!ok) return;

    if (!formData.lat || !formData.lng) {
      setError("Пожалуйста, нажмите «Найти» на карте");
      return;
    }

    setLoading(true);

    try {
      const uploadedLocalUrls = await uploadLocalImages();
      const remoteUrls = gallery
        .filter((item) => item.kind === "remote")
        .map((item) => item.src);

      const imageUrls = [...remoteUrls, ...uploadedLocalUrls];

      const toNum = (val: any) =>
        val === "" || val === null || val === undefined ? null : Number(val);

      const { city: _cityName, ...listingFormData } = formData;

      const submissionData = {
        ...listingFormData,
        user_id: user.id,
        city_id: profile?.city_id ?? null,
        city: profile?.city?.name || formData.city || null,
        price: toNum(formData.price) || 0,
        rooms: toNum(formData.rooms),
        area_total: toNum(formData.area_total),
        floor: toNum(formData.floor),
        floors_total: toNum(formData.floors_total),
        image_urls: imageUrls,
        coordinates: `POINT(${formData.lng} ${formData.lat})`,
        status: "active",
      };

      if (existingListingId) {
        const { error: updateError } = await supabase
          .from("listings")
          .update(submissionData)
          .eq("id", existingListingId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("listings")
          .insert([submissionData]);

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTimeout(() => router.push(`/profile/${user.id}#housing`), 1500);
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить жильё");
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted || checkingAccess) return null;

  if (user === null) {
    return (
      <BlockedState
        icon={<ShieldCheck size={44} className="text-indigo-500" />}
        eyebrow="Access"
        title="Сначала войди в аккаунт"
        description="Добавление жилья доступно только авторизованным пользователям."
        primaryLabel="Войти"
        onPrimary={() => router.push("/login")}
        secondaryLabel="Назад"
        onSecondary={() => router.back()}
      />
    );
  }

  if (!profile?.isOnboarded) {
    return (
      <BlockedState
        icon={<Users2 size={44} className="text-indigo-500" />}
        eyebrow="Profile"
        title="Сначала заверши онбординг"
        description="Сначала нужно заполнить профиль, чтобы система понимала, кто ты и в каком сценарии ищешь соседа."
        primaryLabel="Пройти онбординг"
        onPrimary={() => router.push("/onboarding")}
        secondaryLabel="В профиль"
        onSecondary={() => router.push(`/profile/${user.id}`)}
      />
    );
  }

  if (!profile?.is_verified) {
    const pending = profile?.verification_status === "pending";
    const rejected = profile?.verification_status === "rejected";

    return (
      <BlockedState
        icon={<ShieldCheck size={44} className="text-indigo-500" />}
        eyebrow="Verification"
        title={
          pending
            ? "Верификация на проверке"
            : rejected
            ? "Нужно пройти верификацию заново"
            : "Подтверди студенческий статус"
        }
        description={
          pending
            ? "После одобрения ты сможешь добавить жильё к своему профилю."
            : rejected
            ? "Предыдущая заявка не прошла проверку. Загрузи студенческий билет ещё раз."
            : "Добавлять жильё могут только подтвержденные студенты."
        }
        primaryLabel={pending ? "Открыть профиль" : "Пройти верификацию"}
        onPrimary={() => router.push(`/profile/${user.id}?verify=1`)}
        secondaryLabel="Назад к поиску"
        onSecondary={() => router.push("/listings")}
      />
    );
  }

  if (!canCreateHousingByStatus) {
    return (
      <BlockedState
        icon={<Home size={44} className="text-indigo-500" />}
        eyebrow="Housing"
        title="Сейчас тебе не нужна карточка жилья"
        description="У тебя people-first сценарий: сначала карточка человека, а жильё добавляют только те, у кого уже есть квартира или свободное место."
        primaryLabel="Открыть профиль"
        onPrimary={() => router.push(`/profile/${user.id}`)}
        secondaryLabel="Смотреть людей"
        onSecondary={() => router.push("/listings")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] pb-20">
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md"
          >
            <div className="text-center space-y-5 px-6">
              <div className="mx-auto w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center shadow-xl shadow-indigo-500/40">
                <CheckCircle size={40} className="text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                  Жильё сохранено
                </h2>
                <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.18em]">
                  Перенаправляем в твой профиль
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-6 pt-12">
        <header className="mb-12">
          <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
            <ChevronRight size={12} /> Korshi.kz / Жильё
          </div>

          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter dark:text-white leading-none">
            {existingListingId ? "Редактировать" : "Добавить"} <br />
            <span className="text-indigo-600">Жильё</span>
          </h1>

          <div className="mt-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50 dark:bg-indigo-950/20 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="text-indigo-500 mt-0.5 shrink-0" size={18} />
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">
                  People-first
                </div>
                <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  Это не отдельная витрина квартир. Жильё прикрепится к твоему
                  профилю и будет показываться рядом с карточкой человека.
                </p>
              </div>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* ИМПОРТ */}
          <section className="bg-indigo-50 dark:bg-indigo-950/20 p-8 rounded-[3rem] border-2 border-indigo-100 dark:border-indigo-900/30">
            <h2 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6">
              <LinkIcon size={14} /> Быстрый импорт данных
            </h2>

            <div className="flex flex-col md:flex-row gap-4">
              <input
                value={krishaUrl}
                onChange={(e) => setKrishaUrl(e.target.value)}
                placeholder="Вставьте ссылку на Krisha.kz..."
                className="flex-1 bg-white dark:bg-slate-900 border-none rounded-2xl px-6 py-5 text-sm font-bold outline-none ring-2 ring-indigo-100 dark:ring-indigo-900/20 focus:ring-indigo-500 transition-all dark:text-white"
              />

              <button
                type="button"
                onClick={handleImportFromKrisha}
                disabled={importing}
                className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {importing ? <Loader2 className="animate-spin" /> : "Импортировать"}
              </button>
            </div>
          </section>

          {/* МЕСТОПОЛОЖЕНИЕ */}
          <section className="space-y-6">
            <h3 className="text-2xl font-black italic uppercase dark:text-white flex items-center gap-3">
              <MapPin className="text-indigo-500" /> 1. Местоположение
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                value={profile?.city?.name || formData.city}
                readOnly
                placeholder="Город"
                className="bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white opacity-70 cursor-not-allowed"
              />

              <div className="md:col-span-2 flex gap-2">
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Улица, дом"
                  className="flex-1 bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white"
                />

                <button
                  type="button"
                  onClick={() => handleFindOnMap()}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 rounded-3xl font-black text-xs uppercase hover:scale-105 transition-all flex items-center gap-2"
                >
                  <Search size={16} /> Найти
                </button>
              </div>
            </div>

            <div className="h-80 rounded-[3rem] overflow-hidden border-4 border-slate-100 dark:border-slate-800 relative">
              <ListingMap
                listings={formData.lat ? [{ ...formData, id: "temp" }] : []}
                onMarkerClick={() => {}}
                key={
                  formData.lat
                    ? `map-${formData.lat}-${formData.lng}`
                    : "empty"
                }
              />

              {!formData.lat && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white text-center">
                  <MapPin size={40} className="mb-2 text-indigo-400 animate-bounce" />
                  <p className="font-black uppercase tracking-widest text-[10px]">
                    Подтвердите адрес кнопкой «Найти»
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ДЕТАЛИ */}
          <section className="space-y-8">
            <h3 className="text-2xl font-black italic uppercase dark:text-white flex items-center gap-3">
              <Info className="text-indigo-500" /> 2. Детали жилья
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">
                  Заголовок
                </label>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Напр: Комната в светлой 2-комнатной квартире"
                  className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl outline-none font-bold dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">
                  Цена (₸)
                </label>
                <input
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl outline-none font-bold dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">
                  Комнат
                </label>
                <input
                  name="rooms"
                  type="number"
                  value={formData.rooms}
                  onChange={handleChange}
                  className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">
                  Площадь м²
                </label>
                <input
                  name="area_total"
                  type="number"
                  value={formData.area_total}
                  onChange={handleChange}
                  className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">
                  Этаж
                </label>
                <input
                  name="floor"
                  type="number"
                  value={formData.floor}
                  onChange={handleChange}
                  className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">
                  Из (всего)
                </label>
                <input
                  name="floors_total"
                  type="number"
                  value={formData.floors_total}
                  onChange={handleChange}
                  className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">
                  Тип недвижимости
                </label>
                <select
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleChange}
                  className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white appearance-none"
                >
                  <option value="apartment">Квартира</option>
                  <option value="house">Дом</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">
                  Срок аренды
                </label>
                <select
                  name="rent_type"
                  value={formData.rent_type}
                  onChange={handleChange}
                  className="w-full bg-slate-100 dark:bg-slate-800/50 p-5 rounded-3xl font-bold outline-none dark:text-white appearance-none"
                >
                  <option value="long">На долгий срок</option>
                  <option value="daily">Посуточно</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4">
                Описание
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                className="w-full bg-slate-100 dark:bg-slate-800/50 p-8 rounded-[2.5rem] outline-none font-medium dark:text-white resize-none"
                placeholder="Опиши жильё: условия, район, правила, кого ищешь..."
              />
            </div>
          </section>

          {/* ГАЛЕРЕЯ */}
          <section className="space-y-8">
            <h3 className="text-2xl font-black italic uppercase dark:text-white flex items-center gap-3">
              <Upload className="text-indigo-500" /> 3. Галерея
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="aspect-[4/5] border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                <Upload
                  className="text-slate-300 group-hover:text-indigo-500 transition-colors"
                  size={32}
                />
                <span className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">
                  Добавить
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImagesChange}
                  className="hidden"
                />
              </label>

              {gallery.map((item) => (
                <div
                  key={item.id}
                  className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden group"
                >
                  <img
                    src={item.src}
                    className="w-full h-full object-cover"
                    alt="Preview"
                  />

                  <button
                    type="button"
                    onClick={() => removeGalleryItem(item.id)}
                    className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* SUBMIT */}
          <div className="pt-10 flex flex-col items-center gap-6 border-t border-slate-100 dark:border-slate-800">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full bg-red-50 dark:bg-red-900/20 text-red-500 p-6 rounded-3xl flex items-center gap-3 font-bold text-sm"
                >
                  <AlertCircle size={20} /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-10 bg-indigo-600 text-white rounded-[3rem] font-black italic uppercase text-3xl tracking-tighter shadow-2xl shadow-indigo-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-4">
                  <Loader2 className="animate-spin" />
                  {existingListingId ? "ОБНОВЛЕНИЕ" : "СОХРАНЕНИЕ"} {progress}%
                </div>
              ) : existingListingId ? (
                "ОБНОВИТЬ ЖИЛЬЁ"
              ) : (
                "СОХРАНИТЬ ЖИЛЬЁ"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BlockedState({
  icon,
  eyebrow,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] flex items-center justify-center px-6">
      <div className="max-w-xl w-full text-center bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-8 md:p-12 shadow-2xl">
        <div className="mx-auto mb-5 w-20 h-20 rounded-[2rem] bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
          {icon}
        </div>

        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-3">
          {eyebrow}
        </div>

        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
          {title}
        </h1>

        <p className="mt-5 text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          {description}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onPrimary}
            className="px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black italic uppercase tracking-tighter shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            {primaryLabel}
          </button>

          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              className="px-8 py-4 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-black italic uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
