import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import DeveloperCard from "./DeveloperCard";

export default function DevelopersList() {
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDevelopers = async () => {
      try {
        const { data, error } = await supabase
          .from("developers")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setDevelopers(data || []);
      } catch (err) {
        console.error("Ошибка загрузки разработчиков:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDevelopers();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Загрузка разработчиков...</div>
      </div>
    );
  }

  if (developers.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Разработчики пока не добавлены</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Адаптивная сетка: 1 колонка на мобилке, 2 на планшете, 3 на десктопе */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {developers.map((dev) => (
          <div key={dev.id} className="w-full">
            <DeveloperCard dev={dev} />
          </div>
        ))}
      </div>
    </div>
  );
}
