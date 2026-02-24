// pages/api/verify-student.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RENDER_OCR_URL = process.env.RENDER_OCR_URL; // e.g. https://xxx.onrender.com
const RENDER_OCR_SECRET = process.env.RENDER_OCR_SECRET;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function getBearer(req: NextApiRequest) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ error: "Missing bearer token" });

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return res.status(401).json({ error: "Invalid token" });

    const userId = userData.user.id;

    const { filePath } = (req.body ?? {}) as { filePath?: string };
    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({ error: "filePath is required" });
    }

    // enforce safe prefix
    if (!filePath.startsWith(`${userId}/`)) {
      return res.status(400).json({ error: "Invalid filePath prefix" });
    }

    // return existing active request (one active per user)
    const { data: active, error: activeErr } = await supabaseAdmin
      .from("verification_requests")
      .select("id,status,created_at")
      .eq("user_id", userId)
      .in("status", ["pending_ocr", "processing", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeErr) throw activeErr;

    let requestId: string;

    if (active?.id) {
      requestId = String(active.id);
    } else {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from("verification_requests")
        .insert({
          user_id: userId,
          file_path: filePath,
          status: "pending_ocr",
          ai_passed: false,
          matches: [],
          ocr_text_preview: null,
          signals: {},
          admin_comment: null,
        })
        .select("id")
        .single();

      if (insErr) throw insErr;

      requestId = String(inserted.id);

      await supabaseAdmin
        .from("profiles")
        .update({ verification_status: "pending" })
        .eq("id", userId);
    }

    // nudge worker (optional, DB poller still works)
    if (RENDER_OCR_URL && RENDER_OCR_SECRET) {
      fetch(`${RENDER_OCR_URL}/process-ocr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RENDER_OCR_SECRET}`,
        },
        body: JSON.stringify({ requestId }),
      }).catch(() => {});
    }

    return res.status(200).json({ requestId });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
}