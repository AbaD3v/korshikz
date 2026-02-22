import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabase/admin";
import { getUserFromAuthHeader } from "../../../../lib/supabase/getUserFromAuthHeader";
import { assertAdmin } from "../../../../lib/supabase/assertAdmin";

type Ok = { ok: true };
type Err = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1️⃣ Проверяем кто вызывает
    const adminUser = await getUserFromAuthHeader(req);
    if (!adminUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 2️⃣ Проверяем что это админ
    await assertAdmin(adminUser.id);

    const { requestId, adminComment } = req.body as {
      requestId?: string;
      adminComment?: string;
    };

    if (!requestId) {
      return res.status(400).json({ error: "Missing requestId" });
    }

    const comment = (adminComment || "").trim();

    // 3️⃣ Получаем заявку
    const { data: request, error: reqErr } = await supabaseAdmin
      .from("verification_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (reqErr || !request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Request is not pending" });
    }

    const userId = request.user_id;

    // 4️⃣ Обновляем заявку → rejected
    const { error: updateReqErr } = await supabaseAdmin
      .from("verification_requests")
      .update({
        status: "rejected",
        admin_comment: comment || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateReqErr) {
      return res.status(500).json({ error: updateReqErr.message });
    }

    // 5️⃣ Обновляем профиль пользователя
    await supabaseAdmin
      .from("profiles")
      .update({
        is_verified: false,
        verification_status: "rejected",
      })
      .eq("id", userId);

    // 6️⃣ Создаём уведомление пользователю
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: "verification_rejected",
      title: "Верификация отклонена",
      body: comment
        ? `Причина: ${comment}`
        : "К сожалению, документ не прошёл проверку.",
      link: "/profile",
      is_read: false,
      created_at: new Date().toISOString(),
    });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res
      .status(e?.statusCode || 500)
      .json({ error: e?.message || "Server error" });
  }
}