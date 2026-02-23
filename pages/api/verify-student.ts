import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../lib/supabase/admin";

type Resp =
  | { submitted: true; requestId: string; status: "pending_ocr" }
  | { submitted: false; error: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Клиент только для проверки access_token -> user
const supabaseAuth = createClient(supabaseUrl, supabaseAnon);

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== "POST") return res.status(405).json({ submitted: false, error: "Method not allowed" });

  try {
    const { filePath } = req.body as { filePath?: string };
    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({ submitted: false, error: "filePath required" });
    }

    // ✅ 1) достаем Bearer token
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ submitted: false, error: "Missing bearer token" });

    // ✅ 2) получаем user по токену
    const { data: u, error: uErr } = await supabaseAuth.auth.getUser(token);
    if (uErr || !u?.user) return res.status(401).json({ submitted: false, error: "Invalid token" });

    const userId = u.user.id;

    // 3) антиспам: 1 pending
    const { data: existingPending, error: pendingErr } = await supabaseAdmin
      .from("verification_requests")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["pending", "pending_ocr"])
      .limit(1);

    if (pendingErr) return res.status(500).json({ submitted: false, error: pendingErr.message });

    if (existingPending?.length) {
      return res.status(200).json({ submitted: true, requestId: existingPending[0].id, status: "pending_ocr" });
    }

    // 4) создаем заявку
    const requestId = crypto.randomUUID();

    const { error: insertErr } = await supabaseAdmin.from("verification_requests").insert({
      id: requestId,
      user_id: userId,
      file_path: filePath,
      status: "pending_ocr",
      ai_passed: null,
      matches: 0,
      ocr_text_preview: null,
      signals: { stage: "queued" },
    });

    if (insertErr) return res.status(500).json({ submitted: false, error: insertErr.message });

    await supabaseAdmin.from("profiles")
      .update({ verification_status: "pending" })
      .eq("id", userId);

    // 5) триггерим Render (fire-and-forget)
    const RENDER_URL = process.env.RENDER_OCR_URL;
    const RENDER_SECRET = process.env.RENDER_OCR_SECRET;

    if (RENDER_URL && RENDER_SECRET) {
      fetch(`${RENDER_URL}/process-ocr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RENDER_SECRET}`,
        },
        body: JSON.stringify({ requestId, userId, filePath }),
      }).catch(() => {});
    }

    return res.status(202).json({ submitted: true, requestId, status: "pending_ocr" });
  } catch (e: any) {
    return res.status(500).json({ submitted: false, error: e?.message ?? "Server error" });
  }
}