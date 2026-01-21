// index.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Инициализация клиента
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { university, budget, myUniversity, myStatus } = req.query;

    // 2. Упрощенный запрос: берем только профили (чтобы точно не упало)
    let query = supabase
      .from('profiles')
      .select('*') // Берем всё из профилей
      .not('status', 'is', null);

    if (university) query = query.ilike('university', `%${university}%`);
    if (budget && budget !== "0") query = query.lte('budget', Number(budget));

    const { data: profiles, error: profileError } = await query;

    if (profileError) throw profileError;

    // 3. Отдельно берем листинги (чтобы избежать ошибки связи JOIN)
    const { data: allListings, error: listError } = await supabase
      .from('listings')
      .select('*');

    // 4. Склеиваем данные вручную (Map profiles with their listings)
    const combinedData = profiles.map(profile => ({
      ...profile,
      listings: allListings?.filter(l => l.user_id === profile.id) || []
    }));

    // 5. Умная сортировка (Matching)
    const sortedData = combinedData.sort((a, b) => {
      if (myUniversity) {
        if (a.university === myUniversity && b.university !== myUniversity) return -1;
        if (a.university !== myUniversity && b.university === myUniversity) return 1;
      }
      return 0;
    });

    return res.status(200).json({ data: sortedData });

  } catch (err) {
    console.error("SERVER ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
}