import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { user_id, status, full_name, university, address, city, price } = req.body;

  // 1. Геокодинг на стороне сервера (обходим 403 Forbidden)
  let lat = 43.2389, lng = 76.9455; // Дефолт: Алматы
  try {
    const searchQuery = `${address}, ${city}`;
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'KorshiKZ_App_Contact_myemail@domain.com' // Nominatim требует это
        }
      }
    );
    const geoData = await geoRes.json();
    if (geoData && geoData.length > 0) {
      lat = parseFloat(geoData[0].lat);
      lng = parseFloat(geoData[0].lon);
    }
  } catch (e) {
    console.error("Nominatim error:", e);
  }

  try {
    // 2. Если статус неактивен — удаляем
    if (status === 'not_looking') {
      await supabase.from('listings').delete().eq('user_id', user_id);
      return res.status(200).json({ message: 'Deleted' });
    }

    // 3. Сохраняем/Обновляем листинг
    const { data, error } = await supabase
      .from('listings')
      .upsert({
        user_id,
        title: `${full_name} (${university})`,
        address: address,
        lat: lat,
        lng: lng,
        price: price,
        visible: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select();

    if (error) throw error;
    return res.status(200).json(data[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}