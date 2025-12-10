// pages/api/listings/[id].js
import { supabase } from '@/lib/supabaseClient';


export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({ message: "Объявление не найдено" });
      }

      return res.status(200).json(data);
    } catch (err) {
      console.error("Ошибка при получении объявления:", err);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  }

  // Можно добавить обработку DELETE / PUT если нужно
  return res.status(405).json({ message: "Метод не разрешен" });
}
