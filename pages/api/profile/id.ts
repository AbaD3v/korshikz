import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id, username, email, avatar_url")
      .eq("id", id)
      .maybeSingle();

    if (pErr) throw pErr;

    const { data: listings, error: lErr } = await supabase
      .from("listings")
      .select("*")
      .eq("user_id", id)
      .order("id", { ascending: false });

    if (lErr) throw lErr;

    return res.status(200).json({ profile, listings });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
