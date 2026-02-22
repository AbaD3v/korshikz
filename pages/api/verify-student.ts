import type { NextApiRequest, NextApiResponse } from "next";

type Ok = { ok: true; from: string; method: string; body?: any };
type Err = { error: string; from: string; method: string; hint?: string };

const FROM = "pages/api/verify-student.ts (verify-student-pages-v3)";

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  // 👇 ЖЕЛЕЗНАЯ подпись (смотри в Network → Response Headers)
  res.setHeader("x-korshi-api", "verify-student-pages-v3");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // Быстрый debug ping
  if (req.query?.__debug === "1") {
    return res.status(200).json({ ok: true, from: FROM, method: req.method || "unknown" });
  }

  // Preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  // ❗ Если сюда прилетит POST, мы НЕ должны отдавать 405 никогда
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      from: FROM,
      method: req.method || "unknown",
      hint: "If you see this JSON+header, request reached this file. If not, 405 is coming from elsewhere.",
    });
  }

  // Минимальный POST-ответ (для диагностики)
  // Тут проверяем, что POST реально доходит до этого файла
  const body = req.body ?? null;

  return res.status(200).json({
    ok: true,
    from: FROM,
    method: req.method,
    body: {
      hasImageUrl: Boolean(body?.imageUrl),
      hasUserId: Boolean(body?.userId),
      hasFilePath: Boolean(body?.filePath),
      filePath: body?.filePath,
    },
  });
}