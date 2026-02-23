import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabase/admin";
import { assertAdmin } from "../../../../lib/supabase/assertAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { filePath } = req.body as { filePath?: string };
    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({ error: "filePath required" });
    }

    // 1) берем Bearer токен
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing bearer token" });

    console.log("host", req.headers.host);
console.log("cookie?", Boolean(req.headers.cookie));
console.log("auth header?", Boolean(req.headers.authorization));
    // 2) получаем пользователя через Supabase Auth
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: "Invalid token" });

    // 3) админ?
    await assertAdmin(data.user.id);

    // 4) signed url
    const signed = await supabaseAdmin.storage
      .from("verification-docs")
      .createSignedUrl(filePath, 300);

    if (signed.error || !signed.data?.signedUrl) {
      return res.status(500).json({ error: "Failed to create signed url" });
    }

    return res.status(200).json({ signedUrl: signed.data.signedUrl });
  } catch (e: any) {
    return res.status(e.statusCode ?? 500).json({ error: e.message ?? "Server error" });
  }
}