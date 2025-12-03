import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { motion } from "framer-motion";
import MapView from "/components/MapView";

export default function ListingDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [listing, setListing] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      // === ЗАГРУЗКА ОБЪЯВЛЕНИЯ ===
      const { data: listingData } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      setListing(listingData);

      // === ВАЖНО: здесь было НЕПРАВИЛЬНОЕ ПОЛЕ ===
      // раньше: listingData?.owner_id
      if (listingData?.user_id) {
        const { data: ownerData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, university, course")
          .eq("id", listingData.user_id)   // ← ВОТ ЭТО ПРАВИЛЬНО
          .single();

        setOwner(ownerData);
      }

      setLoading(false);
    };

    loadData();
  }, [id]);

  if (loading) return <div className="text-center py-20">Загрузка…</div>;
  if (!listing) return <div className="text-center py-20">Объявление не найдено 😕</div>;

  // === ГАЛЕРЕЯ ===
  let images = [];
  try {
    if (Array.isArray(listing.image_urls)) {
      images = listing.image_urls;
    } else if (typeof listing.image_urls === "string") {
      images = listing.image_urls
        .replace(/[{}"]/g, "")
        .split(",")
        .filter(Boolean);
    }
  } catch {}

  if (images.length === 0) images = ["/no-image.png"];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <motion.div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* ГАЛЕРЕЯ */}
        <div className="relative w-full h-96 overflow-hidden">
          <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory">
            {images.map((src, index) => (
              <img
                key={index}
                src={src}
                alt="listing photo"
                className="w-full h-96 object-cover snap-center flex-shrink-0"
              />
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <h1 className="text-3xl font-bold">{listing.title}</h1>

          <p className="text-gray-600 dark:text-gray-300">
            {listing.description}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl">
              <p className="text-gray-500">Цена</p>
              <p className="text-2xl font-bold text-emerald-600">
                {listing.price} ₸
              </p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl">
              <p className="text-gray-500">Город</p>
              <p className="text-xl font-bold">{listing.city}</p>
            </div>
          </div>

          {listing.lat && listing.lng && (
            <MapView
              coordinates={[listing.lat, listing.lng]}
              height="350px"
              showCard={true}
            />
          )}

          {/* ВЛАДЕЛЕЦ */}
          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-5 rounded-xl border">
            {owner ? (
              <>
                <div className="flex items-center gap-4">
                  <img
                    src={owner.avatar_url || "/default-avatar.png"}
                    className="w-16 h-16 rounded-full object-cover border"
                  />
                  <div>
                    <div className="text-lg font-semibold">
                      {owner.full_name || "Без имени"}
                    </div>
                    <div className="text-gray-500 text-sm">
                      {owner.university} — {owner.course} курс
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/chat/${owner.id}`)}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
                >
                  Написать
                </button>
              </>
            ) : (
              <>
                <div className="text-gray-600">Профиль владельца не найден</div>
                <button
                  className="px-5 py-2 bg-gray-400 text-white rounded-xl"
                  disabled
                >
                  Написать
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => router.push("/listings")}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl"
          >
            ← Назад к объявлениям
          </button>
        </div>
      </motion.div>
    </div>
  );
}
