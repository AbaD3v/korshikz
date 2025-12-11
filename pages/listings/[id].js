// pages/listings/[id].js
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/hooks/utils/supabase/client";
import MapView from "@/components/mapview";

// MOBILE-FIRST, production-ready Listing detail with thorough responsive fixes
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

  // new: mobile map fullscreen state
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  // detect mobile/tablet for feature toggles
  const [isMobile, setIsMobile] = useState(false);

  // touch swipe support
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const formatPrice = (val) =>
    val == null ? "" : new Intl.NumberFormat("ru-RU").format(Number(val)) + " ₸";

  const parseImageUrls = (raw) => {
    try {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw.filter(Boolean);
      if (typeof raw === "string") {
        const cleaned = raw.replace(/^\s*\{|\}\s*$/g, "").replace(/["\[\]]/g, "");
        return cleaned.split(",").map((s) => s.trim()).filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  };

  // keyboard navigation for gallery + close fullscreen map
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
        setMobileMapOpen(false);
      }
      if (!images.length) return;
      if (e.key === "ArrowRight") setActiveIndex((i) => Math.min(i + 1, images.length - 1));
      if (e.key === "ArrowLeft") setActiveIndex((i) => Math.max(i - 1, 0));
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
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (mounted) setUser(authData?.data?.user ?? null);
        } catch (e) {
          console.warn("auth.getUser error", e);
        }

        const { data: listingData, error: listingErr } = await supabase
          .from("listings")
          .select("*")
          .eq("id", id)
          .single();

        if (listingErr) throw listingErr;
        if (!mounted) return;
        setListing(listingData);

        const imgs = parseImageUrls(listingData?.image_urls);
        setImages(imgs.length ? imgs : ["/no-image.png"]);
        setActiveIndex(0);

        if (listingData?.user_id) {
          const { data: ownerData, error: ownerErr } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, university, course, phone")
            .eq("id", listingData.user_id)
            .single();

          if (ownerErr && ownerErr.code !== "PGRST116") {
            console.warn("owner load error", ownerErr);
          } else {
            setOwner(ownerData ?? null);
          }
        }

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

  // complaint stub (now uses confirmation and avoids layout shift)
  const onReport = () => {
    const reason = prompt("Опишите причину жалобы (коротко)");
    if (!reason) return;
    alert("Жалоба отправлена модераторам");
  };

  // gallery controls
  const prevImage = () => setActiveIndex((i) => Math.max(0, i - 1));
  const nextImage = () => setActiveIndex((i) => Math.min(images.length - 1, i + 1));
  const openLightbox = (idx = 0) => {
    setActiveIndex(idx);
    setLightboxOpen(true);
  };

  // touch handlers for swipe gallery (mobile UX)
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const onTouchEnd = () => {
    if (touchStartX.current == null || touchEndX.current == null) return;
    const dx = touchStartX.current - touchEndX.current;
    const threshold = 50; // px
    if (dx > threshold) nextImage();
    else if (dx < -threshold) prevImage();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // prevent background scroll while mobile map fullscreen is open
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mobileMapOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileMapOpen]);

  if (loading)
    return (
      <div className="text-center py-20 text-lg animate-pulse">Загрузка данных…</div>
    );

  if (error)
    return (
      <div className="text-center py-20 text-red-600">Ошибка загрузки: {error}</div>
    );

  if (!listing)
    return (
      <div className="text-center py-20 text-xl">Объявление не найдено 😕</div>
    );

  return (
    <>
      <Head>
        <title>{listing.title ? `${listing.title} — Объявление` : "Объявление"}</title>
        <meta name="description" content={listing.description || listing.title || ""} />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700"
        >
          {/* gallery */}
          <div
            className="relative w-full h-[280px] sm:h-[520px] bg-black"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
              <button
                onClick={prevImage}
                aria-label="Предыдущее фото"
                className="pointer-events-auto bg-black/40 text-white p-2 rounded-full"
                style={{ backdropFilter: 'blur(4px)' }}
              >
                ‹
              </button>
              <button
                onClick={nextImage}
                aria-label="Следующее фото"
                className="pointer-events-auto bg-black/40 text-white p-2 rounded-full"
                style={{ backdropFilter: 'blur(4px)' }}
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
                      loading="lazy"
                      style={{ cursor: "zoom-in" }}
                    />
                    <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded-md text-sm">
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
                  <img src={src} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="title-clamp text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {listing.title}
                </h1>

                {listing.address && (
                  <div className="text-sm text-gray-500 mt-2 truncate">{listing.address}</div>
                )}

                <div className="mt-3 flex flex-wrap gap-2 items-center text-sm text-gray-600">
                  <div>Просмотров: <strong>{listing.views ?? 0}</strong></div>
                  {listing.category && (
                    <div className="px-2 py-0.5 bg-gray-100 rounded text-sm">{listing.category}</div>
                  )}
                  {listing.property_type && (
                    <div className="px-2 py-0.5 bg-gray-100 rounded text-sm">{listing.property_type}</div>
                  )}
                </div>
              </div>

              <div className="w-full sm:w-56 flex-shrink-0 flex flex-col items-stretch gap-3">
                <div className="text-right">
                  <div className="text-2xl sm:text-2xl font-bold text-emerald-600">{formatPrice(listing.price)}</div>
                  {listing.rent_type && <div className="text-sm text-gray-500">{listing.rent_type}</div>}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={toggleSave}
                    className={`px-3 py-2 rounded-lg border flex-1 text-center whitespace-nowrap ${saved ? "bg-emerald-600 text-white" : "bg-white text-gray-700"}`}
                    aria-pressed={saved}
                  >
                    {saved ? "Сохранено" : "Сохранить"}
                  </button>

                  <button onClick={onShare} className="px-3 py-2 rounded-lg border bg-white flex-1 text-center whitespace-nowrap">
                    Поделиться
                  </button>
                </div>
              </div>
            </div>

            {/* DESCRIPTION */}
            {listing.description && (
              <section>
                <h2 className="text-lg font-semibold mb-2">Описание</h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed break-words">{listing.description}</p>
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

                <div className="relative">
                  <div className="w-full h-[250px] sm:h-[360px] rounded-xl overflow-hidden border">
                    <MapView
                      coordinates={[listing.lat, listing.lng]}
                      height="100%"
                      showCard={false}
                      disableScrollZoom={isMobile} /* pass to MapView if supported */
                    />
                  </div>

                  <button
                    aria-label="Открыть карту на весь экран"
                    onClick={() => setMobileMapOpen(true)}
                    className="sm:hidden absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded-lg text-sm backdrop-blur shadow"
                  >
                    Развернуть карту
                  </button>
                </div>
              </section>
            )}
{/* OWNER / ACTIONS */}
<div className="bg-gray-50 dark:bg-gray-800 border p-3 sm:p-4 rounded-xl flex flex-col gap-4">

  {/* ------ OWNER INFO ------ */}
  <div className="flex items-start gap-3 min-w-0">
    <img
      src={owner?.avatar_url || "/default-avatar.png"}
      className="w-14 h-14 rounded-full object-cover border flex-shrink-0"
      alt="avatar"
    />

    <div className="min-w-0 flex flex-col">
      <div className="font-semibold text-base sm:text-lg truncate max-w-[220px] sm:max-w-[280px]">
        {owner?.full_name || "Без имени"}
      </div>

      <div className="text-sm text-gray-500 truncate max-w-[220px] sm:max-w-[280px]">
        {owner?.university
          ? `${owner.university}${owner.course ? ` — ${owner.course} курс` : ""}`
          : ""}
      </div>
    </div>
  </div>

  {/* ------ ACTION BUTTONS ------ */}
  <div className="w-full flex flex-col sm:flex-row sm:flex-wrap gap-2">
    <button
      onClick={startChat}
      className="w-full sm:w-auto flex-1 text-sm px-4 py-2 bg-emerald-600 text-white rounded-lg text-center"
    >
      Написать
    </button>

    <button
      onClick={openWhatsApp}
      className="w-full sm:w-auto flex-1 text-sm px-4 py-2 border rounded-lg text-center"
    >
      WhatsApp
    </button>

    <button
      onClick={onCall}
      className="w-full sm:w-auto flex-1 text-sm px-4 py-2 border rounded-lg text-center"
    >
      Позвонить
    </button>

    <button
      onClick={onReport}
      className="w-full sm:w-auto flex-1 text-sm px-4 py-2 border rounded-lg text-red-600 text-center"
    >
      Пожаловаться
    </button>
  </div>
</div>
{/* META (дата + ID) */}
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 pt-1 text-sm text-gray-500">
  <div className="truncate">Добавлено: {new Date(listing.created_at).toLocaleString()}</div>
  <div className="truncate">ID: {listing.id}</div>
</div>
</div> {/* <-- closes p-6 wrapper */ }
</motion.div>
</div>

{/* Sticky mobile action bar (prevents overflow and keeps buttons accessible) */}
<div className="sm:hidden">
  <div className="fixed bottom-4 left-4 right-4 z-50">
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-2 shadow-lg">
      {/* horizontal scroll if too many buttons; inner container min-width to allow natural sizing */}
      <div className="flex gap-2 min-w-max overflow-x-auto px-1">
        <button onClick={startChat} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm whitespace-nowrap">Написать</button>
        <button onClick={openWhatsApp} className="px-3 py-2 border rounded-lg text-sm whitespace-nowrap">WhatsApp</button>
        <button onClick={onCall} className="px-3 py-2 border rounded-lg text-sm whitespace-nowrap">Позвонить</button>
        <button onClick={onReport} className="px-3 py-2 border rounded-lg text-sm text-red-600 whitespace-nowrap">Пожаловаться</button>
      </div>
    </div>
  </div>
</div>


      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85">
          <button className="absolute top-6 right-6 text-white text-2xl" onClick={() => setLightboxOpen(false)} aria-label="Закрыть">✕</button>
          <button className="absolute left-6 text-white text-3xl" onClick={prevImage} aria-label="Предыдущее">‹</button>
          <div className="max-w-[96%] max-h-[92%]">
            <img src={images[activeIndex]} className="max-w-full max-h-[90vh] object-contain" alt={`Фото ${activeIndex + 1}`} />
            <div className="text-center text-white mt-3">{activeIndex + 1} / {images.length}</div>
          </div>
          <button className="absolute right-6 text-white text-3xl" onClick={nextImage} aria-label="Следующее">›</button>
        </div>
      )}

      {/* Fullscreen mobile map modal */}
      {mobileMapOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex flex-col">
          <div className="flex items-center justify-between p-3 text-white">
            <div className="text-lg font-semibold">Карта</div>
            <div className="flex items-center gap-2">
              <button
                className="text-sm bg-white/10 px-3 py-1 rounded"
                onClick={() => {
                  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listing.lat},${listing.lng}`)}`;
                  window.open(url, "_blank");
                }}
                aria-label="Открыть в Google Maps"
              >
                Открыть в Google Maps
              </button>

              <button className="text-2xl px-3 py-0.5" onClick={() => setMobileMapOpen(false)} aria-label="Закрыть карту">✕</button>
            </div>
          </div>

          <div className="flex-1">
            <MapView coordinates={[listing.lat, listing.lng]} height="100%" showCard={false} disableScrollZoom={false} />
          </div>
        </div>
      )}

      {/* title clamp & small responsive tweaks */}
      <style jsx>{`
        .title-clamp { display: block; }
        @media (max-width: 640px) {
          .title-clamp {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
          }
        }

        /* ensure long buttons/text don't overflow the viewport */
        :global(body) { overscroll-behavior-y: contain; }
      `}</style>
    </>
  );
}

/* -------------------------
   Small presentational components
   ------------------------- */

function DetailCard({ label, children }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl border">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-base font-medium">{children}</div>
    </div>
  );
}
