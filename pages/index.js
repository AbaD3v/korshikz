// pages/listings/index.js
import { useEffect, useState } from "react";
import { supabase } from "/lib/supabaseClient";

export default function ListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      const { data, error } = await supabase.from("listings").select("*");
      if (error) {
        console.error("Ошибка загрузки объявлений:", error);
      } else {
        setListings(data || []);
      }
      setLoading(false);
    };
    fetchListings();
  }, []);

  if (loading) return <div className="p-6 text-center">Загрузка...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Доступные объявления</h1>
      {listings.length === 0 ? (
        <p>Нет объявлений 😔</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="border rounded-xl p-4 shadow hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold">{listing.title}</h2>
              <p className="text-gray-600 text-sm mt-1">{listing.city}</p>
              <p className="mt-3">{listing.description}</p>
              <p className="mt-3 font-semibold">
                Цена: {(listing.price / listing.totalSpots).toLocaleString()} ₸ / человек
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Мест: {listing.filledSpots}/{listing.totalSpots}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
