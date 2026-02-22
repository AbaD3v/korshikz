import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabase/admin";
import { getUserFromAuthHeader } from "../../../lib/supabase/getUserFromAuthHeader";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await getUserFromAuthHeader(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10) || 20, 50);

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("id,type,title,body,link,is_read,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: "Failed to load notifications" });
  return res.status(200).json({ items: data ?? [] });
}