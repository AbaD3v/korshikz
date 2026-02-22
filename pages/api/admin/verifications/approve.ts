import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabase/admin";
import { assertAdmin } from "../../../../lib/supabase/assertAdmin";
import { getUserFromAuthHeader } from "../../../../lib/supabase/getUserFromAuthHeader";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { requestId } = req.body as { requestId?: string };
    if (!requestId || typeof requestId !== "string") {
      return res.status(400).json({ error: "requestId required" });
    }

    const user = await getUserFromAuthHeader(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    await assertAdmin(user.id);

    // 1) берём заявку
    const { data: vr, error: vrErr } = await supabaseAdmin
      .from("verification_requests")
      .select("id,user_id,status")
      .eq("id", requestId)
      .single();

    if (vrErr || !vr) return res.status(404).json({ error: "Request not found" });
    if (vr.status !== "pending") return res.status(409).json({ error: "Request is not pending" });

    const now = new Date().toISOString();

    // 2) обновляем заявку
    const { error: upReqErr } = await supabaseAdmin
      .from("verification_requests")
      .update({
        status: "approved",
        admin_id: user.id,
        decided_at: now,
      })
      .eq("id", requestId)
      .eq("status", "pending");

    if (upReqErr) return res.status(500).json({ error: "Failed to update request" });

    // 3) обновляем профиль
    const { error: upProfileErr } = await supabaseAdmin
      .from("profiles")
      .update({
        is_verified: true,
        verification_status: null,
      })
      .eq("id", vr.user_id);

    if (upProfileErr) return res.status(500).json({ error: "Failed to update profile" });

    // ✅ 4) создаём уведомление пользователю
    const { error: notifErr } = await supabaseAdmin.from("notifications").insert({
      user_id: vr.user_id,
      type: "verification_approved",
      title: "Верификация одобрена",
      body: "Ваш студенческий документ подтверждён администратором.",
      link: "/profile",
    });

    if (notifErr) console.log("[approve] notification insert error:", notifErr.message);

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(e.statusCode ?? 500).json({ error: e.message ?? "Server error" });
  }
}