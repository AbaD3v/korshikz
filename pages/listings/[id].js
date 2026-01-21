import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "../../hooks/utils/supabase/client"; 
import MapView from "../../components/mapview";
import { 
  ArrowLeft, Share2, MapPin, Eye, Heart, 
  List, PlusCircle, ChevronDown, Info, X 
} from "lucide-react";

export default function ListingDetail() {
  const router = useRouter();
  const [listing, setListing] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

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
    } catch (e) { return []; }
  };

  useEffect(() => {
    // 1. Пытаемся достать ID всеми способами сразу
    const queryId = router.query.id;
    const pathId = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : null;
    const realId = queryId && queryId !== '[id]' ? queryId : pathId;

    if (!realId || realId === '[id]') return;

    let mounted = true;

    async function fetchData() {
      setLoading(true);
      try {
        // Загружаем объявление
        const { data: listingData, error: lErr } = await supabase
          .from("listings")
          .select("*")
          .eq("id", realId)
          .single();

        if (lErr) throw lErr;

        if (mounted && listingData) {
          setListing(listingData);
          setImages(parseImageUrls(listingData.image_urls));

          // Загружаем владельца по user_id из твоей базы (как на скриншоте)
          if (listingData.user_id) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", listingData.user_id)
              .single();

            if (profileData && mounted) {
              setOwner(profileData);
            }
          }
        }
      } catch (err) {
        console.error("Ошибка загрузки:", err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    return () => { mounted = false; };
  }, [router.query.id, router.isReady]);

  if (loading) return <div className="min-h-screen flex items-center justify-center dark:bg-[#020617]"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!listing) return <div className="min-h-screen flex items-center justify-center dark:bg-[#020617] text-white">Объявление не найдено</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pb-24 md:pb-10">
      <Head>
        <title>{listing.title} — Korshi</title>
      </Head>

      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-indigo-600 flex items-center gap-2 text-sm font-black transition-all">
          <ArrowLeft size={18} /> НАЗАД
        </button>

        <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* ГАЛЕРЕЯ */}
          <section className="relative h-[320px] sm:h-[550px] bg-gray-100 dark:bg-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <img src={images[activeIndex] || "/no-image.png"} className="w-full h-full object-cover" alt="Property" />
          </section>

          {/* КОНТЕНТ */}
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-gray-100 dark:border-gray-800 space-y-8">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white uppercase">
                  {listing.title}
                </h1>
                <div className="flex items-center gap-2 text-gray-500 font-bold">
                  <MapPin size={20} className="text-indigo-500" />
                  <span className="text-lg">{listing.address}</span>
                </div>
              </div>
              <div className="text-4xl font-black text-indigo-600 tracking-tighter">
                {formatPrice(listing.price)}
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg font-medium whitespace-pre-wrap">
              {listing.description}
            </p>

            {/* ВЛАДЕЛЕЦ — ГЛАВНЫЙ ФИКС */}
            <div className="pt-10 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-8">
              {owner?.id ? (
                <Link href={`/profile/${owner.id}`} className="flex items-center gap-5 group cursor-pointer transition-all">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-indigo-50 dark:border-indigo-900/30 shadow-xl group-hover:border-indigo-500 transition-all">
                    <img src={owner?.avatar_url || "/default-avatar.png"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Owner" />
                  </div>
                  <div>
                    <div className="text-xl font-black dark:text-white leading-none group-hover:text-indigo-600 transition-colors">
                      {owner?.full_name || "Пользователь"}
                    </div>
                    <div className="text-indigo-500 font-bold mt-1 uppercase text-xs tracking-wider">
                      {owner?.university || "Студент"}
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-5 animate-pulse">
                  <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-24 bg-slate-100 dark:bg-slate-900 rounded" />
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={() => owner?.id && router.push(`/chat/${owner.id}`)} 
                  className="flex-1 md:flex-none px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl transition-all font-black text-xs uppercase tracking-widest active:scale-95"
                >
                  Написать
                </button>
              </div>
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  );
}