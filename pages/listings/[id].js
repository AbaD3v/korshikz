// pages/listings/[id].js
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/hooks/utils/supabase/client"; // <- используй свой путь к supabase, если отличается
import MapView from "@/components/mapview";

export default function ListingDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [listing, setListing] = useState(null);
  const [owner, setOwner] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [incViewDone, setIncViewDone] = useState(false);

  // helpers
  const formatPrice = (val) =>
    val == null ? "" : new Intl.NumberFormat("ru-RU").format(Number(val)) + " ₸";

  const parseImageUrls = (raw) => {
    try {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw.filter(Boolean);
      if (typeof raw === "string") {
        // handles Postgres text array like '{"url1","url2"}' or '{url1,url2}' or '["url1","url2"]'
        const cleaned = raw.replace(/^\s*\{|\}\s*$/g, "").replace(/["\[\]]/g, "");
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

  // keyboard navigation for gallery
  useEffect(() => {
    const onKey = (e) => {
      if (!images.length) return;
      if (e.key === "ArrowRight") setActiveIndex((i) => Math.min(i + 1, images.length - 1));
      if (e.key === "ArrowLeft") setActiveIndex((i) => Math.max(i - 1, 0));
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length]);

  // load current user, listing and owner
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);

      try {
        // load auth user (optional)
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (mounted) setUser(authData?.data?.user ?? null);
        } catch (e) {
          // ignore auth error for listing page
          console.warn("auth.getUser error", e);
        }

        // load listing
        const { data: listingData, error: listingErr } = await supabase
          .from("listings")
          .select("*")
          .eq("id", id)
          .single();

        if (listingErr) throw listingErr;
        if (!mounted) return;
        setListing(listingData);

        // parse images robustly
        const imgs = parseImageUrls(listingData?.image_urls);
        setImages(imgs.length ? imgs : ["/no-image.png"]);
        setActiveIndex(0);

        // load owner profile if exists
        if (listingData?.user_id) {
          const { data: ownerData, error: ownerErr } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, university, course, phone")
            .eq("id", listingData.user_id)
            .single();

          if (ownerErr && ownerErr.code !== "PGRST116") {
            // PGRST116 often means zero rows — ignore gracefully
            console.warn("owner load error", ownerErr);
          } else {
            setOwner(ownerData ?? null);
          }
        }

        // increment views (one-time per page load)
        try {
          if (!incViewDone) {
            await supabase
              .from("listings")
              .update({ views: (listingData?.views ?? 0) + 1 })
              .eq("id", id);
            setIncViewDone(true);
          }
        } catch (e) {
          console.warn("inc views error", e);
        }
      } catch (e) {
        console.error("load listing error", e);
        setError(e?.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  // Local save/favourite (simple localStorage)
  useEffect(() => {
    if (!id) return;
    const savedMap = JSON.parse(localStorage.getItem("saved_listings_v1") || "{}");
    setSaved(Boolean(savedMap[id]));
  }, [id]);

  const toggleSave = () => {
    const savedMap = JSON.parse(localStorage.getItem("saved_listings_v1") || "{}");
    if (saved) {
      delete savedMap[id];
      setSaved(false);
    } else {
      savedMap[id] = { savedAt: new Date().toISOString(), title: listing?.title ?? "" };
      setSaved(true);
    }
    localStorage.setItem("saved_listings_v1", JSON.stringify(savedMap));
  };

  // share
  const onShare = async () => {
    const shareUrl = `${location.origin}/listings/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing?.title || "Объявление", url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Ссылка скопирована в буфер обмена");
      }
    } catch (e) {
      console.warn("share error", e);
      alert("Не получилось поделиться");
    }
  };

  // open whatsapp safely
  const openWhatsApp = () => {
    const phone = owner?.phone?.replace(/[^\d+]/g, "");
    if (!phone) {
      alert("Телефон владельца не указан");
      return;
    }
    const text = encodeURIComponent(`Привет! Я заинтересован в объявлении: ${listing?.title || ""}`);
    const href = `https://wa.me/${phone}?text=${text}`;
    window.open(href, "_blank");
  };

  // call phone
  const onCall = () => {
    const phone = owner?.phone?.replace(/[^\d+]/g, "");
    if (!phone) {
      alert("Телефон владельца не указан");
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  // go to chat
  const startChat = () => {
    if (!owner?.id) {
      alert("Профиль владельца не доступен");
      return;
    }
    router.push(`/chat/${owner.id}`);
  };

  // complaint stub
  const onReport = () => {
    const reason = prompt("Опишите причину жалобы (коротко)");
    if (!reason) return;
    // отправить в таблицу reports (опционально) — здесь лишь уведомление
    alert("Жалоба отправлена модераторам");
    // optionally insert to supabase.from("reports").insert({...})
  };

  // gallery controls
  const prevImage = () => setActiveIndex((i) => Math.max(0, i - 1));
  const nextImage = () => setActiveIndex((i) => Math.min(images.length - 1, i + 1));
  const openLightbox = (idx = 0) => {
    setActiveIndex(idx);
    setLightboxOpen(true);
  };

  if (loading)
    return (
      <div className="text-center py-20 text-lg animate-pulse">
        Загрузка данных…
      </div>
    );

  if (error)
    return (
      <div className="text-center py-20 text-red-600">
        Ошибка загрузки: {error}
      </div>
    );

  if (!listing)
    return (
      <div className="text-center py-20 text-xl">
        Объявление не найдено 😕
      </div>
    );

  return (
    <>
      <Head>
        <title>{listing.title ? `${listing.title} — Объявление` : "Объявление"}</title>
        <meta name="description" content={listing.description || listing.title || ""} />
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700"
        >
          {/* gallery */}
          <div className="relative w-full h-[520px] bg-black">
            <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
              <button
                onClick={prevImage}
                aria-label="Предыдущее фото"
                className="pointer-events-auto bg-black/40 text-white p-2 rounded-full"
              >
                ‹
              </button>
              <button
                onClick={nextImage}
                aria-label="Следующее фото"
                className="pointer-events-auto bg-black/40 text-white p-2 rounded-full"
              >
                ›
              </button>
            </div>

            <div className="h-full w-full flex overflow-hidden">
              <div
                className="flex h-full transition-transform ease-out duration-300"
                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
              >
                {images.map((src, i) => (
                  <div key={i} className="w-full h-full flex-shrink-0 relative">
                    <img
                      src={src}
                      alt={`Фото ${i + 1}`}
                      className="w-full h-full object-cover"
                      onClick={() => openLightbox(i)}
                      style={{ cursor: "zoom-in" }}
                    />
                    <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-md text-sm">
                      {i === activeIndex ? `${i + 1}/${images.length}` : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* thumbnails */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex gap-2">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Показать фото ${i + 1}`}
                  className={`w-12 h-8 rounded overflow-hidden border ${i === activeIndex ? "ring-2 ring-emerald-500" : "border-white/30"}`}
                >
                  <img src={src} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="p-7 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold tracking-tight">{listing.title}</h1>
                {listing.address && (
                  <div className="text-sm text-gray-500 mt-1">{listing.address}</div>
                )}
                <div className="mt-3 flex flex-wrap gap-3 items-center text-sm text-gray-600">
                  <div>Просмотров: <strong>{listing.views ?? 0}</strong></div>
                  {listing.category && <div className="px-2 py-0.5 bg-gray-100 rounded">{listing.category}</div>}
                  {listing.property_type && <div className="px-2 py-0.5 bg-gray-100 rounded">{listing.property_type}</div>}
                </div>
              </div>

              <div className="w-56 flex flex-col gap-3 items-end">
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-600">{formatPrice(listing.price)}</div>
                  {listing.rent_type && <div className="text-sm text-gray-500">{listing.rent_type}</div>}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={toggleSave}
                    className={`px-3 py-2 rounded-lg border ${saved ? "bg-emerald-600 text-white" : "bg-white text-gray-700"}`}
                    aria-pressed={saved}
                  >
                    {saved ? "Сохранено" : "Сохранить"}
                  </button>

                  <button
                    onClick={onShare}
                    className="px-3 py-2 rounded-lg border bg-white"
                  >
                    Поделиться
                  </button>
                </div>
              </div>
            </div>

            {/* DESCRIPTION */}
            {listing.description && (
              <section>
                <h2 className="text-xl font-semibold mb-2">Описание</h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{listing.description}</p>
              </section>
            )}

            {/* DETAILS grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailCard label="Комнаты">{listing.rooms ?? "—"}</DetailCard>
              <DetailCard label="Площадь">{listing.area_total ? `${listing.area_total} м²` : "—"}</DetailCard>
              <DetailCard label="Этаж">{listing.floor ? `${listing.floor}${listing.floors_total ? ` / ${listing.floors_total}` : ""}` : "—"}</DetailCard>
              <DetailCard label="Год постройки">{listing.year_built ?? "—"}</DetailCard>
            </section>

            {/* MAP */}
            {listing.lat && listing.lng && (
              <section>
                <h3 className="text-lg font-semibold mb-2">Расположение</h3>
                <div className="w-full h-[360px] rounded-xl overflow-hidden border">
                  <MapView coordinates={[listing.lat, listing.lng]} height="100%" showCard={false} />
                </div>
              </section>
            )}

            {/* OWNER / ACTIONS */}
            <div className="bg-gray-50 dark:bg-gray-800 border p-4 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img src={owner?.avatar_url || "/default-avatar.png"} className="w-16 h-16 rounded-full object-cover border" alt="avatar" />
                <div>
                  <div className="font-semibold text-lg">{owner?.full_name || "Без имени"}</div>
                  <div className="text-sm text-gray-500">{owner?.university ? `${owner.university}${owner.course ? ` — ${owner.course} курс` : ""}` : ""}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={startChat} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">Написать</button>
                <button onClick={openWhatsApp} className="px-4 py-2 border rounded-lg">WhatsApp</button>
                <button onClick={onCall} className="px-4 py-2 border rounded-lg">Позвонить</button>
                <button onClick={onReport} className="px-4 py-2 border rounded-lg text-red-600">Пожаловаться</button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">Добавлено: {new Date(listing.created_at).toLocaleString()}</div>
              <div className="text-sm text-gray-500">ID: {listing.id}</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <button className="absolute top-6 right-6 text-white text-2xl" onClick={() => setLightboxOpen(false)} aria-label="Закрыть">✕</button>
          <button className="absolute left-6 text-white text-3xl" onClick={prevImage} aria-label="Предыдущее">‹</button>
          <div className="max-w-[90%] max-h-[90%]">
            <img src={images[activeIndex]} className="max-w-full max-h-[90vh] object-contain" alt={`Фото ${activeIndex + 1}`} />
            <div className="text-center text-white mt-3">{activeIndex + 1} / {images.length}</div>
          </div>
          <button className="absolute right-6 text-white text-3xl" onClick={nextImage} aria-label="Следующее">›</button>
        </div>
      )}
    </>
  );
}

/* -------------------------
   Small presentational components
   ------------------------- */

function DetailCard({ label, children }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl border">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-base font-medium">{children}</div>
    </div>
  );
}
