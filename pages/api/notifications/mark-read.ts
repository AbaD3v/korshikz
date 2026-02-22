import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabase/admin";
import { getUserFromAuthHeader } from "../../../lib/supabase/getUserFromAuthHeader";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await getUserFromAuthHeader(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.body as { id?: string };
  if (!id) return res.status(400).json({ error: "id required" });

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return res.status(500).json({ error: "Failed to update" });
  return res.status(200).json({ ok: true });
}