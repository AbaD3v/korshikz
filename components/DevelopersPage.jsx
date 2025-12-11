import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import DevelopersList from "./DevelopersList";
import AddDeveloperForm from "./AddDeveloperForm";

export default function DevelopersPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        setProfile(data);
      } catch (err) {
        console.error("Ошибка загрузки профиля:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* Заголовок */}
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Разработчики
        </h1>

        {/* Форма добавления разработчика (только для создателей) */}
        {profile?.role === "creator" && (
          <div className="mb-12 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Добавить разработчика
            </h2>
            <AddDeveloperForm />
          </div>
        )}

        {/* Список разработчиков */}
        <div className="w-full">
          <DevelopersList />
        </div>
      </div>
    </div>
  );
}
