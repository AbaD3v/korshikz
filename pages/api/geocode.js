// pages/api/geocode.js
// POST { address: string } -> { lat, lng } or 404/400
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { address } = req.body || {};
    if (!address || typeof address !== "string" || !address.trim()) {
      return res.status(400).json({ error: "Address required" });
    }

    const apiKey = process.env.YANDEX_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Geocode API key not configured" });
    }

    const geocodeUrl = `https://geocode-maps.yandex.ru/1.x/?format=json&apikey=${encodeURIComponent(apiKey)}&geocode=${encodeURIComponent(address)}`;

    const r = await fetch(geocodeUrl);
    if (!r.ok) {
      return res.status(502).json({ error: "Geocoding service error" });
    }
    const data = await r.json();

    const pos = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
    if (!pos) {
      return res.status(404).json({ error: "Address not found" });
    }

    // Yandex returns "lng lat"
    const [lngStr, latStr] = pos.split(" ");
    const lat = Number(latStr);
    const lng = Number(lngStr);

    if (!isFinite(lat) || !isFinite(lng)) {
      return res.status(500).json({ error: "Invalid coordinates returned" });
    }

    return res.status(200).json({ lat, lng });
  } catch (err) {
    console.error("geocode error:", err);
    return res.status(500).json({ error: "Internal server error", details: String(err.message || err) });
  }
}
