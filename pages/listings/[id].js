"use client";

import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/hooks/utils/supabase/client";
import MapView from "@/components/mapview";
import { 
  ArrowLeft, Share2, MapPin, Eye, MessageSquare, 
  Phone, Heart, Info, List, PlusCircle, ChevronDown, X, AlertCircle 
} from "lucide-react";

export default function ListingDetail() {
  const router = useRouter();
  const { id } = router.query;

  // --- Состояния из твоего исходника ---
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
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  // --- Логика определения мобилки ---
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
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
    } catch { return []; }
  };

  // --- Клавиатура (Esc, Стрелки) ---
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setLightboxOpen(false); setMobileMapOpen(false); }
      if (!images.length) return;
      if (e.key === "ArrowRight") setActiveIndex((i) => Math.min(i + 1, images.length - 1));
      if (e.key === "ArrowLeft") setActiveIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length]);

  // --- Загрузка данных (Полная версия) ---
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (mounted) setUser(authData?.user ?? null);

        const { data: listingData, error: listingErr } = await supabase
          .from("listings").select("*").eq("id", id).single();

        if (listingErr) throw listingErr;
        if (!mounted) return;
        setListing(listingData);

        const imgs = parseImageUrls(listingData?.image_urls);
        setImages(imgs.length ? imgs : ["/no-image.png"]);

        if (listingData?.user_id) {
          const { data: ownerData } = await supabase
            .from("profiles").select("id, full_name, avatar_url, university, course, phone")
            .eq("id", listingData.user_id).single();
          setOwner(ownerData);
        }

        if (!incViewDone) {
          await supabase.from("listings")
            .update({ views: (listingData?.views ?? 0) + 1 }).eq("id", id);
          setIncViewDone(true);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  // --- Локальное избранное ---
  useEffect(() => {
    if (!id) return;
    const savedMap = JSON.parse(localStorage.getItem("saved_listings_v1") || "{}");
    setSaved(Boolean(savedMap[id]));
  }, [id]);

  const toggleSave = () => {
    const savedMap = JSON.parse(localStorage.getItem("saved_listings_v1") || "{}");
    if (saved) { delete savedMap[id]; setSaved(false); }
    else { savedMap[id] = { savedAt: new Date().toISOString(), title: listing?.title }; setSaved(true); }
    localStorage.setItem("saved_listings_v1", JSON.stringify(savedMap));
  };

const onShare = async () => {
    const shareUrl = `${window.location.origin}/listings/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: listing?.title, url: shareUrl });
      } catch (err) {
        console.log("Отмена шаринга");
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Ссылка скопирована");
    }
  };

  const openWhatsApp = () => {
    if (!owner?.phone) return alert("Телефон не указан");

    // Форматируем телефон: удаляем всё кроме цифр и меняем 8 на 7
    let phone = owner.phone.replace(/\D/g, "");
    if (phone.startsWith("8")) phone = "7" + phone.slice(1);

    // Ссылка на текущее объявление для сообщения
    const shareUrl = `${window.location.origin}/listings/${id}`;
    
    // Формируем текст сообщения
    const message = `Здравствуйте! Меня заинтересовало ваше объявление: "${listing?.title}". \nЦена: ${listing?.price} ₸ \nСсылка: ${shareUrl}`;
    
    // Кодируем сообщение для URL
    const encodedMessage = encodeURIComponent(message);

    // Открываем WhatsApp (для wa.me плюс в номере не обязателен, достаточно чистых цифр)
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, "_blank");
  };

  // --- Свайпы для галереи ---
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchMove = (e) => { touchEndX.current = e.touches[0].clientX; };
  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const dx = touchStartX.current - touchEndX.current;
    if (dx > 50) setActiveIndex((i) => Math.min(images.length - 1, i + 1));
    else if (dx < -50) setActiveIndex((i) => Math.max(0, i - 1));
    touchStartX.current = null; touchEndX.current = null;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#020617]"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center dark:bg-[#020617] text-red-500 p-4 text-center">Ошибка: {error}</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500 pb-24 md:pb-10">
      <Head>
        <title>{listing.title} — Korshi</title>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0" />
      </Head>

      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-6">
        
        {/* Панель навигации */}
        <div className="flex justify-between items-center">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-indigo-600 dark:text-gray-400 flex items-center gap-2 text-sm font-black transition-all">
            <ArrowLeft size={18} /> НАЗАД
          </button>
          <div className="flex items-center gap-2">
            <button onClick={toggleSave} className={`p-3 rounded-2xl border transition-all ${saved ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400'}`}>
              <Heart size={20} fill={saved ? "white" : "none"} />
            </button>
            <button onClick={onShare} className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-300 active:scale-95 transition-all">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <motion.main 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* ГАЛЕРЕЯ */}
          <section 
            className="relative h-[320px] sm:h-[550px] bg-gray-100 dark:bg-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white dark:border-gray-800 cursor-zoom-in"
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            onClick={() => setLightboxOpen(true)}
          >
            <AnimatePresence mode="wait">
              <motion.img 
                key={activeIndex} src={images[activeIndex]} 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-full h-full object-cover" 
              />
            </AnimatePresence>

            <div className="absolute bottom-6 right-6 bg-black/40 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase">
              {activeIndex + 1} / {images.length}
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? "w-8 bg-indigo-500" : "w-1.5 bg-white/50"}`} />
              ))}
            </div>
          </section>

          {/* КОНТЕНТ */}
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-gray-100 dark:border-gray-800 space-y-8">
            
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight uppercase">
                  {listing.title}
                </h1>
                <div className="flex items-center gap-2 text-gray-500 font-bold">
                  <MapPin size={20} className="text-indigo-500" />
                  <span className="text-lg">{listing.address}</span>
                </div>
              </div>

              <div className="hidden md:block text-right bg-indigo-50/50 dark:bg-indigo-900/10 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30 min-w-[280px]">
                <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">
                  {formatPrice(listing.price)}
                </div>
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-2">Ежемесячно</div>
              </div>
            </div>

            {/* СЕТКА ДЕТАЛЕЙ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DetailCard label="Комнаты" icon={List}>{listing.rooms ?? "—"}</DetailCard>
              <DetailCard label="Площадь" icon={PlusCircle}>{listing.area_total ? `${listing.area_total} м²` : "—"}</DetailCard>
              <DetailCard label="Этаж" icon={ChevronDown}>{listing.floor ? `${listing.floor}/${listing.floors_total}` : "—"}</DetailCard>
              <DetailCard label="Постройка" icon={Info}>{listing.year_built ?? "—"}</DetailCard>
            </div>

            {/* ОПИСАНИЕ */}
            <div className="space-y-4">
              <h3 className="text-2xl font-black tracking-tight dark:text-white uppercase text-sm opacity-50">Описание</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg font-medium whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            {/* КАРТА */}
            {listing.lat && (
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                   <h3 className="text-2xl font-black tracking-tight dark:text-white uppercase text-sm opacity-50">Расположение</h3>
                   <button onClick={() => setMobileMapOpen(true)} className="text-indigo-600 font-black text-xs uppercase">На весь экран</button>
                </div>
                <div className="h-[280px] rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 relative">
                  <MapView coordinates={[listing.lat, listing.lng]} height="100%" showCard={false} />
                </div>
              </div>
            )}

            {/* ВЛАДЕЛЕЦ (стиль твоего профиля) */}
            <div className="pt-10 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-indigo-50 dark:border-indigo-900/30 shadow-xl">
                  <img src={owner?.avatar_url || "/default-avatar.png"} className="w-full h-full object-cover" alt="Owner" />
                </div>
                <div>
                  <div className="text-xl font-black dark:text-white leading-none">{owner?.full_name || "Пользователь"}</div>
                  <div className="text-indigo-500 font-bold mt-1 uppercase text-xs tracking-wider">
                    {owner?.university || "Частное лицо"} {owner?.course ? `• ${owner.course} курс` : ""}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={openWhatsApp} className="flex-1 md:flex-none px-8 py-4 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-2xl shadow-xl shadow-green-500/20 transition-all font-black text-xs uppercase tracking-widest active:scale-95">
                  WhatsApp
                </button>
                <button onClick={() => router.push(`/chat/${owner?.id}`)} className="flex-1 md:flex-none px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-500/20 transition-all font-black text-xs uppercase tracking-widest active:scale-95">
                  Написать
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest pt-4">
               <div>Добавлено: {new Date(listing.created_at).toLocaleDateString()}</div>
               <div className="flex items-center gap-1.5"><Eye size={12}/> {listing.views ?? 0}</div>
            </div>
          </div>
        </motion.main>
      </div>

      {/* LIGHTBOX (твоя логика + новый визуал) */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4"
          >
            <button onClick={() => setLightboxOpen(false)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"><X size={32}/></button>
            <img src={images[activeIndex]} className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" />
            <div className="mt-8 flex gap-3 overflow-x-auto pb-4 max-w-full px-4">
               {images.map((img, i) => (
                 <button key={i} onClick={() => setActiveIndex(i)} className={`w-16 h-12 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${i === activeIndex ? "border-indigo-500 scale-110" : "border-white/10 opacity-50"}`}>
                   <img src={img} className="w-full h-full object-cover" />
                 </button>
               ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN MAP MODAL */}
      <AnimatePresence>
        {mobileMapOpen && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} className="fixed inset-0 z-[70] bg-white dark:bg-gray-950 flex flex-col">
            <div className="p-4 flex justify-between items-center border-b dark:border-gray-800">
              <span className="font-black uppercase tracking-widest text-sm">Карта</span>
              <button onClick={() => setMobileMapOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={20}/></button>
            </div>
            <div className="flex-1"><MapView coordinates={[listing.lat, listing.lng]} height="100%" showCard={false} /></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE STICKY BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-2xl border-t border-gray-100 dark:border-gray-800 p-5 z-50 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{formatPrice(listing.price)}</div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">В месяц</div>
        </div>
        <button onClick={() => router.push(`/chat/${owner?.id}`)} className="bg-indigo-600 text-white px-10 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/30 active:scale-95 transition-all">
          Написать
        </button>
      </div>
    </div>
  );
}

function DetailCard({ label, children, icon: Icon }) {
  return (
    <div className="bg-[#F8FAFC] dark:bg-[#020617]/50 p-5 rounded-[2rem] border border-gray-100 dark:border-gray-800 transition-all hover:border-indigo-200 dark:hover:border-indigo-900/40 group">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-white dark:bg-gray-800 rounded-xl text-indigo-500 shadow-sm group-hover:scale-110 transition-transform">
          <Icon size={18} />
        </div>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">{label}</span>
      </div>
      <div className="text-xl font-black text-gray-900 dark:text-white truncate">{children}</div>
    </div>
  );
}