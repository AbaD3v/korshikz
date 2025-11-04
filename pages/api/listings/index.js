import { useEffect, useState } from "react";
import { supabase } from "/../../lib/supabaseClient";

export default function ListingsPage() {
  const [listings, setListings] = useState([]);
  const [cityFilter, setCityFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, []);

  async function fetchListings() {
    setLoading(true);
    let query = supabase.from("listings").select("*").order("id", { ascending: false });

    if (cityFilter) {
      query = query.ilike("city", `%${cityFilter}%`);
    }

    const { data, error } = await query;
    if (error) console.error(error);
    else setListings(data);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 text-gray-900 dark:text-gray-100">
      <h1 className="text-4xl font-bold text-center mb-10">Объявления</h1>

      {/* Фильтр */}
      <div className="max-w-md mx-auto mb-8 flex gap-3">
        <input
          type="text"
          placeholder="Введите город..."
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="flex-1 p-3 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        <button
          onClick={fetchListings}
          className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          🔍 Найти
        </button>
      </div>

      {/* Список объявлений */}
      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400">Загрузка...</p>
      ) : listings.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400">Объявлений не найдено 😕</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {listings.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition p-6 flex flex-col justify-between border border-gray-200 dark:border-gray-700"
            >
              <div>
                <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">{item.title}</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{item.description}</p>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-400 mt-auto">
                <span>📍 {item.city}</span>
                <span className="font-semibold text-blue-600">
                  {item.price?.toLocaleString("ru-RU")} ₸
                </span>
              </div>
              <div className="mt-2 text-gray-500 text-sm">
                Мест: {item.filledspots}/{item.totalspots}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
