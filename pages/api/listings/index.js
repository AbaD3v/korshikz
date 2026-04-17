// pages/api/listings/index.js
import { createClient } from "@supabase/supabase-js";

const getFirstQueryValue = (value) => {
  if (Array.isArray(value)) return value[0];
  return value;
};

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const universityId = getFirstQueryValue(req.query.university_id);
    const budget = getFirstQueryValue(req.query.budget);
    const myUniversityId = getFirstQueryValue(req.query.myUniversityId);
    const status = getFirstQueryValue(req.query.status);
    const search = getFirstQueryValue(req.query.search);

    let query = supabase
      .from("profiles")
      .select(`
        *,
        city:cities(id, name),
        university:universities(id, name, city_id)
      `)
      .eq("is_verified", true)
      .not("status", "is", null)
      .neq("status", "inactive");

    if (universityId) {
      query = query.eq("university_id", universityId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.ilike("full_name", `%${search}%`);
    }

    if (budget && budget !== "0" && !Number.isNaN(Number(budget))) {
      query = query.lte("budget", Number(budget));
    }

    const { data: profiles, error: profileError } = await query;

    if (profileError) throw profileError;

    if (!profiles || profiles.length === 0) {
      return res.status(200).json({ data: [] });
    }

    const profileIds = profiles.map((profile) => profile.id);

    const { data: allListings, error: listError } = await supabase
      .from("listings")
      .select(`
        *,
        city_ref:cities(id, name)
      `)
      .in("user_id", profileIds)
      .order("created_at", { ascending: false });

    if (listError) throw listError;

    const listingsByUserId = new Map();

    for (const listing of allListings || []) {
      const current = listingsByUserId.get(listing.user_id) || [];
      current.push(listing);
      listingsByUserId.set(listing.user_id, current);
    }

    const combinedData = profiles.map((profile) => ({
      ...profile,
      listings: listingsByUserId.get(profile.id) || [],
    }));

    const sortedData = combinedData.sort((a, b) => {
      if (myUniversityId) {
        if (a.university_id === myUniversityId && b.university_id !== myUniversityId) return -1;
        if (a.university_id !== myUniversityId && b.university_id === myUniversityId) return 1;
      }

      return 0;
    });

    return res.status(200).json({ data: sortedData });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({
      error: err?.message || "Internal server error",
    });
  }
}
