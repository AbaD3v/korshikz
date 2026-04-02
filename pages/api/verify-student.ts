// pages/api/verify-student.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "verification-docs";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
function getMimeTypeFromExt(ext: string) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  return "image/jpeg";
}
function getBearer(req: NextApiRequest) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

function getFileExt(filePath: string) {
  return filePath.split(".").pop()?.toLowerCase() || "";
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function stripCodeFences(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonObject(text: string) {
  const cleaned = stripCodeFences(text);

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start !== -1 && end !== -1 && end > start) {
      const slice = cleaned.slice(start, end + 1);
      return JSON.parse(slice);
    }

    throw new Error(`worker_non_json_text:${cleaned}`);
  }
}

function buildRejectPayload(message: string, extraSignals?: Record<string, unknown>) {
  return {
    ai_passed: false,
    admin_comment: message,
    last_error: message,
    next_retry_at: null,
    signals: {
      provider: "cloudflare_gemma_vision",
      processed_at: new Date().toISOString(),
      ...(extraSignals || {}),
    },
  };
}
async function downloadFileBuffer(filePath: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(filePath);

  if (error || !data) {
    throw new Error(error?.message || "Failed to download file");
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
function analyzeStudentDocument(rawText: string) {
  const text = normalizeText(rawText);

  const strongKeywords = [
    "студент",
    "student",
    "студенческий",
    "student card",
    "student id",
    "университет",
    "university",
    "faculty",
    "факультет",
    "оқу",
    "оқиды",
    "education",
    "campus",
  ];

  const universityKeywords = [
    "enu",
    "e.n.u",
    "гумилев",
    "гумилёв",
    "gumilyov",
    "евразийский национальный университет",
    "nazarbayev university",
    "astana it university",
    "aitu",
    "seifullin",
    "сейфуллин",
    "mnu",
    "maqsut narikbayev university",
    "медицинский университет астана",
  ];

  const mediumKeywords = [
    "id",
    "card",
    "билет",
    "group",
    "группа",
    "specialty",
    "специальность",
    "course",
    "курс",
    "бакалавр",
    "магистрант",
    "student no",
    "student number",
  ];

  const strongHits = strongKeywords.filter((k) => text.includes(k));
  const universityHits = universityKeywords.filter((k) => text.includes(k));
  const mediumHits = mediumKeywords.filter((k) => text.includes(k));

  const hasLongNumber = /\b\d{4,}\b/.test(text);
  const hasDate = /\b\d{2}[./-]\d{2}[./-]\d{2,4}\b/.test(text);

  const hasStudentWord =
    text.includes("student") ||
    text.includes("студент") ||
    text.includes("студенческий");

  const hasUniversityWord =
    text.includes("university") ||
    text.includes("университет") ||
    text.includes("faculty") ||
    text.includes("факультет");

  const hasStudentCombo = hasStudentWord && hasUniversityWord;

  let score = 0;
  score += strongHits.length * 18;
  score += universityHits.length * 22;
  score += mediumHits.length * 6;
  if (hasLongNumber) score += 8;
  if (hasDate) score += 4;
  if (hasStudentCombo) score += 18;

  const textLength = rawText.trim().length;

  const aiPassed =
    textLength >= 10 &&
    (hasStudentCombo ||
      universityHits.length > 0 ||
      (strongHits.length >= 1 && mediumHits.length >= 1) ||
      score >= 28);

  return {
    aiPassed,
    score,
    matches: [...strongHits, ...universityHits, ...mediumHits],
    signals: {
      strong_hits: strongHits,
      university_hits: universityHits,
      medium_hits: mediumHits,
      has_long_number: hasLongNumber,
      has_date: hasDate,
      has_student_combo: hasStudentCombo,
      score,
      text_length: textLength,
      provider: "cloudflare_gemma_vision",
      processed_at: new Date().toISOString(),
    },
  };
}

async function runCloudflareOCR(imageDataUrl: string): Promise<{
  isStudentDocument: boolean;
  university: string | null;
  visibleText: string;
  confidence: number;
}> {
  const workerUrl = process.env.CLOUDFLARE_OCR_URL;

  if (!workerUrl) {
    throw new Error("CLOUDFLARE_OCR_URL is missing");
  }

  const res = await fetch(workerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_data_url: imageDataUrl,
    }),
  });

  const raw = await res.text();

  console.log("[verify-student] worker status:", res.status);
  console.log("[verify-student] worker raw response:", raw);

  if (!res.ok) {
    throw new Error(raw);
  }

  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`worker_bad_json:${raw}`);
  }

  if (!json?.ok) {
    throw new Error(JSON.stringify(json));
  }

  const llmText = String(json?.text || "").trim();

  if (!llmText) {
    throw new Error(`worker_empty_text:${raw}`);
  }

  const parsed = extractJsonObject(llmText);

  return {
    isStudentDocument: Boolean(parsed?.is_student_document),
    university: parsed?.university ? String(parsed.university) : null,
    visibleText: String(parsed?.visible_text || "").trim(),
    confidence: Number(parsed?.confidence ?? 0),
  };
}

async function markRejected(
  requestId: string,
  userId: string,
  {
    message,
    extractedText = null,
    matches = [],
    signals = {},
  }: {
    message: string;
    extractedText?: string | null;
    matches?: string[];
    signals?: Record<string, unknown>;
  }
) {
  await supabaseAdmin
    .from("verification_requests")
    .update({
      status: "rejected",
      matches,
      ocr_text_preview: extractedText ? extractedText.slice(0, 1500) : null,
      ...buildRejectPayload(message, signals),
    })
    .eq("id", requestId);

  await supabaseAdmin
    .from("profiles")
    .update({ verification_status: "rejected" })
    .eq("id", userId);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("========== [verify-student] START ==========");
  console.log("[verify-student] method:", req.method);

  if (req.method !== "POST") {
    console.log("[verify-student] method not allowed");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = getBearer(req);
    console.log("[verify-student] bearer exists:", !!token);

    if (!token) {
      console.log("[verify-student] missing bearer token");
      return res.status(401).json({ error: "Missing bearer token" });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    console.log("[verify-student] auth user error:", userErr?.message || null);
    console.log("[verify-student] auth user id:", userData?.user?.id || null);

    if (userErr || !userData?.user) {
      console.log("[verify-student] invalid token");
      return res.status(401).json({ error: "Invalid token" });
    }

    const userId = userData.user.id;
    const { filePath } = (req.body ?? {}) as { filePath?: string };

    console.log("[verify-student] filePath:", filePath);

    if (!filePath || typeof filePath !== "string") {
      console.log("[verify-student] filePath missing");
      return res.status(400).json({ error: "filePath is required" });
    }

    if (!filePath.startsWith(`${userId}/`)) {
      console.log("[verify-student] invalid filePath prefix", { userId, filePath });
      return res.status(400).json({ error: "Invalid filePath prefix" });
    }

    const allowedExts = ["jpg", "jpeg", "png", "webp"];
    const ext = getFileExt(filePath);
    console.log("[verify-student] ext:", ext);

    if (!allowedExts.includes(ext)) {
      console.log("[verify-student] unsupported file type");
      return res.status(400).json({ error: "Unsupported file type" });
    }

    const { data: active, error: activeErr } = await supabaseAdmin
      .from("verification_requests")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["pending_ocr", "processing", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("[verify-student] active request error:", activeErr?.message || null);
    console.log("[verify-student] active request id:", active?.id || null);

    if (activeErr) throw activeErr;

    let requestId: string;

    if (active?.id) {
      requestId = String(active.id);
      console.log("[verify-student] reusing request:", requestId);

      const { error: updErr } = await supabaseAdmin
        .from("verification_requests")
        .update({
          file_path: filePath,
          status: "processing",
          ai_passed: false,
          matches: [],
          ocr_text_preview: null,
          signals: {},
          admin_comment: null,
          last_error: null,
          next_retry_at: null,
        })
        .eq("id", requestId);

      console.log("[verify-student] update existing request error:", updErr?.message || null);
      if (updErr) throw updErr;
    } else {
      console.log("[verify-student] creating new request");

      const { data: inserted, error: insErr } = await supabaseAdmin
        .from("verification_requests")
        .insert({
          user_id: userId,
          file_path: filePath,
          status: "processing",
          ai_passed: false,
          matches: [],
          ocr_text_preview: null,
          signals: {},
          admin_comment: null,
        })
        .select("id")
        .single();

      console.log("[verify-student] insert request error:", insErr?.message || null);
      console.log("[verify-student] inserted request id:", inserted?.id || null);

      if (insErr) throw insErr;
      requestId = String(inserted.id);
    }

    try {
      console.log("[verify-student] downloading file from bucket...");
const buffer = await downloadFileBuffer(filePath);

const mimeType = getMimeTypeFromExt(ext);
const imageDataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

console.log("[verify-student] data URI created, length:", imageDataUrl.length);
console.log("[verify-student] calling Cloudflare AI worker...");

const aiResult = await runCloudflareOCR(imageDataUrl);

console.log("[verify-student] AI result START");
console.log(JSON.stringify(aiResult, null, 2));
console.log("[verify-student] AI result END");

      const cleanedText = aiResult.visibleText.trim();

      console.log("[verify-student] visible text START");
      console.log(cleanedText);
      console.log("[verify-student] visible text END");
      console.log("[verify-student] visible text length:", cleanedText.length);

      if (!cleanedText || cleanedText.length < 6) {
        console.log("[verify-student] rejected: weak visible text");

        await markRejected(requestId, userId, {
          message: "Не удалось распознать документ. Загрузите четкое фото студенческого билета.",
          extractedText: cleanedText,
          signals: {
            weak_text: true,
            text_length: cleanedText.length,
            confidence: aiResult.confidence,
            university: aiResult.university,
          },
        });

        return res.status(422).json({
          error: "Не удалось распознать документ. Загрузите четкое фото студенческого билета.",
        });
      }

      const analysis = analyzeStudentDocument(cleanedText);

      console.log("[verify-student] analysis START");
      console.log(JSON.stringify(analysis, null, 2));
      console.log("[verify-student] analysis END");

      const visionLooksValid =
        aiResult.isStudentDocument && aiResult.confidence >= 0.35;

      const textLooksValid =
        analysis.aiPassed || analysis.score >= 15;

      if (!visionLooksValid && !textLooksValid) {
        console.log("[verify-student] rejected by AI + text filter");

        await markRejected(requestId, userId, {
          message: "Документ не похож на студенческий билет.",
          extractedText: cleanedText,
          matches: analysis.matches,
          signals: {
            ...analysis.signals,
            vision_is_student_document: aiResult.isStudentDocument,
            vision_confidence: aiResult.confidence,
            vision_university: aiResult.university,
            rejected_by_filter: true,
          },
        });

        return res.status(422).json({
          error: "Документ не похож на студенческий билет.",
        });
      }

      console.log("[verify-student] passed filter, sending to admin");

      const { error: updateErr } = await supabaseAdmin
        .from("verification_requests")
        .update({
          status: "pending",
          ai_passed: true,
          matches: analysis.matches,
          ocr_text_preview: cleanedText.slice(0, 1500),
          signals: {
            ...analysis.signals,
            vision_is_student_document: aiResult.isStudentDocument,
            vision_confidence: aiResult.confidence,
            vision_university: aiResult.university,
          },
          admin_comment: null,
          last_error: null,
          next_retry_at: null,
        })
        .eq("id", requestId);

      console.log("[verify-student] update pending error:", updateErr?.message || null);
      if (updateErr) throw updateErr;

      const { error: profileErr } = await supabaseAdmin
        .from("profiles")
        .update({ verification_status: "pending" })
        .eq("id", userId);

      console.log("[verify-student] profile pending update error:", profileErr?.message || null);
      if (profileErr) throw profileErr;

      console.log("[verify-student] SUCCESS requestId:", requestId);
      console.log("========== [verify-student] END SUCCESS ==========");

      return res.status(200).json({
        ok: true,
        requestId,
      });
    } catch (ocrError: any) {
      const msg = String(ocrError?.message || "OCR failed");

      console.log("[verify-student] OCR ERROR START");
      console.log("[verify-student] OCR error message:", msg);
      console.log("[verify-student] OCR ERROR END");

      await markRejected(requestId, userId, {
        message: "Не удалось распознать документ. Загрузите четкое фото студенческого билета.",
        extractedText: null,
        signals: {
          technical_error: msg,
          degraded: true,
        },
      });

      console.log("========== [verify-student] END OCR FAIL ==========");

      return res.status(422).json({
        error: "Не удалось распознать документ. Загрузите четкое фото студенческого билета.",
      });
    }
  } catch (e: any) {
    console.log("[verify-student] FATAL ERROR:", e?.message || e);
    console.log("========== [verify-student] END FATAL ==========");

    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
}