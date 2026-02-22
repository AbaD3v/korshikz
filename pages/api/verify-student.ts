import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

type OkResponse = {
  submitted?: boolean;
  ai_passed?: boolean;
  matches?: number;
  request_status?: "pending";
  debug?: any;
};

type ErrResponse = {
  error: string;
  method?: string;
  debug?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OkResponse | ErrResponse>
) {
  // Всегда JSON
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // ---------------------------
  // 🔍 DEBUG РЕЖИМ
  // Открой:
  // https://www.korshikz.space/api/verify-student?__debug=1
  // ---------------------------
  if (req.query?.__debug === "1") {
    return res.status(200).json({
      debug: {
        from: "pages/api/verify-student.ts",
        method: req.method,
        url: req.url,
        time: new Date().toISOString(),
        hasBody: !!req.body,
      },
    });
  }

  // ---------------------------
  // ✅ OPTIONS (preflight fix)
  // ---------------------------
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  console.log("[verify-student] METHOD:", req.method);

  // ---------------------------
  // ❗ Если не POST — покажем метод
  // ---------------------------
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      method: req.method,
    });
  }

  try {
    const { imageUrl, userId, filePath } = req.body as {
      imageUrl?: string;
      userId?: string;
      filePath?: string;
    };

    console.log("[verify-student] body:", {
      hasImageUrl: !!imageUrl,
      userId,
      filePath,
    });

    if (!imageUrl || !userId || !filePath) {
      return res.status(400).json({
        error: "Missing imageUrl or userId or filePath",
      });
    }

    // ---------------------------
    // 🔑 Supabase
    // ---------------------------
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        error: "Missing SUPABASE env vars",
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // ---------------------------
    // 📥 Минимальная проверка (без OCR)
    // Чтобы убедиться, что POST реально работает
    // ---------------------------

    // Проверим есть ли уже pending
    const { data: existing } = await supabaseAdmin
      .from("verification_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(1);

    if (!existing || existing.length === 0) {
      const { error } = await supabaseAdmin
        .from("verification_requests")
        .insert({
          user_id: userId,
          file_path: filePath,
          matches: 2,
          ai_passed: true,
          status: "pending",
          ocr_text_preview: "Debug mode insert",
          signals: { debug: true },
        });

      if (error) {
        return res.status(500).json({
          error: "Insert error: " + error.message,
        });
      }
    }

    await supabaseAdmin
      .from("profiles")
      .update({ verification_status: "pending" })
      .eq("id", userId);

    return res.status(200).json({
      submitted: true,
      ai_passed: true,
      matches: 2,
      request_status: "pending",
    });
  } catch (err: any) {
    console.error("[verify-student] ERROR:", err);
    return res.status(500).json({
      error: err?.message || "Server error",
    });
  }
}