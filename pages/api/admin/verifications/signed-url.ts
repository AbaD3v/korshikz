import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "../../../../lib/supabase/serverSupabase";
import { supabaseAdmin } from "../../../../lib/supabase/admin";
import { assertAdmin } from "../../../../lib/supabase/assertAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { filePath } = req.body as { filePath?: string };
    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({ error: "filePath required" });
    }

    // 1) текущий пользователь
    const supabase = createSupabaseServerClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    // 2) админ?
    await assertAdmin(user.id);

    // 3) выдаём signedUrl на private bucket
    const { data, error } = await supabaseAdmin
      .storage
      .from("verification-docs")
      .createSignedUrl(filePath, 300);

    if (error || !data?.signedUrl) {
      return res.status(500).json({ error: "Failed to create signed url" });
    }

    return res.status(200).json({ signedUrl: data.signedUrl });
  } catch (e: any) {
    return res.status(e.statusCode ?? 500).json({ error: e.message ?? "Server error" });
  }
}