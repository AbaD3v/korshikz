import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabase/admin";
import { assertAdmin } from "../../../../lib/supabase/assertAdmin";
import { getUserFromAuthHeader } from "../../../../lib/supabase/getUserFromAuthHeader";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    await assertAdmin(user.id);

    // pending заявки + профиль (join через foreign key user_id -> profiles.id)
    const { data, error } = await supabaseAdmin
      .from("verification_requests")
      .select(`
        id,
        user_id,
        file_path,
        matches,
        ai_passed,
        status,
        created_at,
        admin_comment,
        ocr_text_preview,
        signals,
        profiles:profiles (
          id,
          full_name,
          username,
          university,
          city,
          is_verified,
          verification_status,
          avatar_url
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ items: data ?? [] });
  } catch (e: any) {
    return res.status(e.statusCode ?? 500).json({ error: e.message ?? "Server error" });
  }
}