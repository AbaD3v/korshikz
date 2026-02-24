// pages/api/verification-status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function getBearer(req: NextApiRequest) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function mapUi(status: string) {
  if (status === "pending_ocr" || status === "processing") return "processing";
  if (status === "pending") return "pending";
  if (status === "approved") return "verified";
  if (status === "rejected") return "error";
  return "idle";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ error: "Missing bearer token" });

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return res.status(401).json({ error: "Invalid token" });

    const userId = userData.user.id;

    const requestIdRaw = req.query.requestId;
    const requestId = (Array.isArray(requestIdRaw) ? requestIdRaw[0] : requestIdRaw) || "";
    if (!requestId) return res.status(400).json({ error: "requestId is required" });
    if (!isUuid(requestId)) return res.status(400).json({ error: "invalid requestId" });

    const { data, error } = await supabaseAdmin
      .from("verification_requests")
      .select(
        "id,status,ai_passed,ocr_text_preview,matches,signals,admin_comment,created_at,updated_at,attempt_count,next_retry_at,last_error"
      )
      .eq("id", requestId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return res.status(404).json({ error: "Not found" });

    const st = String(data.status || "").toLowerCase();

    return res.status(200).json({
      ok: true,
      request: { ...data, status: st },
      uiState: mapUi(st),
      retryAfterMs: st === "pending_ocr" || st === "processing" ? 3000 : 10000,
      meta: {
        attemptCount: data.attempt_count ?? 0,
        nextRetryAt: data.next_retry_at,
        lastError: data.last_error,
        ocrProvider: data?.signals?.ocr_provider ?? null,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
}