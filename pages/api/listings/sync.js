//sync.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const pickRelation = (value) => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user_id, status, address, price } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "Missing user_id" });
  }

  let cityName = "Алматы";
  let universityName = null;
  let fullName = "Пользователь";

  try {
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select(`
        full_name,
        city:cities(name),
        university:universities(name, city_id)
      `)
      .eq("id", user_id)
      .single();

    if (profileError) throw profileError;

    const city = pickRelation(profileRow.city);
    const university = pickRelation(profileRow.university);

    cityName = city?.name || cityName;
    universityName = university?.name || null;
    fullName = profileRow.full_name || fullName;
  } catch (profileLookupError) {
    return res.status(500).json({ error: profileLookupError.message });
  }

  // Геокодинг на сервере по нормализованному городу из профиля.
  let lat = 43.2389;
  let lng = 76.9455;

  try {
    const searchQuery = `${address}, ${cityName}`;
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        searchQuery
      )}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "KorshiKZ_App_Contact_myemail@domain.com",
        },
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
    if (status === "not_looking") {
      await supabase.from("listings").delete().eq("user_id", user_id);
      return res.status(200).json({ message: "Deleted" });
    }

    const { data, error } = await supabase
      .from("listings")
      .upsert(
        {
          user_id,
          title: universityName ? `${fullName} (${universityName})` : fullName,
          address,
          lat,
          lng,
          price,
          visible: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select();

    if (error) throw error;

    return res.status(200).json(data[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
