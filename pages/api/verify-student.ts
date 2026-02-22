import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import FormData from "form-data";
import Tesseract from "tesseract.js";


// pdf-poppler имеет слабые типы, поэтому берём через require
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfPoppler: any = require("pdf-poppler");

type OkResponse = {
  submitted: boolean;
  ai_passed: boolean;
  matches: number;
  reason?: string;
  request_status?: "pending";
  ocr_provider?: "ocrspace" | "tesseract" | "tesseract_pdf";
  signals?: any;
};

type ErrResponse = { error: string };

// ----------------- ANTI-SPAM KEYWORDS -----------------
const KEYWORDS = [
  "студенттік",
  "студенческий",
  "студент",
  "билет",
  "университет",
  "university",
  "колледж",
  "college",
  "факультет",
  "faculty",
  "student",
  "бакалавр",
  "магистратура",
];

const DOC_MARKERS = [
  /университет|university/i,
  /колледж|college/i,
  /факультет|faculty/i,
  /студент|student/i,
  /student\s*id/i,
];

function countKeywords(text: string) {
  const t = (text || "").toLowerCase();
  return KEYWORDS.reduce((acc, kw) => acc + (t.includes(kw) ? 1 : 0), 0);
}

function hasDocMarker(text: string) {
  return DOC_MARKERS.some((re) => re.test(text || ""));
}

function hasIdLikeNumber(text: string) {
  return /\b\d{6,12}\b/.test(text || "");
}

function decidePass(text: string) {
  const matches = countKeywords(text);
  const marker = hasDocMarker(text);
  const idLike = hasIdLikeNumber(text);

  // антиспам:
  // - минимум 2 keyword
  // - и доп. сигнал (маркер документа или номер)
  const ai_passed = matches >= 2 && (marker || idLike);

  return {
    matches,
    ai_passed,
    signals: {
      hasMarker: marker,
      hasIdLike: idLike,
      keywordsMatched: matches,
    },
  };
}

// ----------------- HELPERS -----------------

async function withRetry<T>(fn: () => Promise<T>, tries = 2, delayMs = 900) {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

function extFromFilePath(filePath: string) {
  const p = filePath.toLowerCase();
  if (p.endsWith(".pdf")) return ".pdf";
  if (p.endsWith(".png")) return ".png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return ".jpg";
  return path.extname(p) || ".bin";
}

function isImageExt(ext: string) {
  return [".png", ".jpg", ".jpeg"].includes(ext.toLowerCase());
}

async function downloadToTemp(url: string, tempFile: string, maxBytes = 10 * 1024 * 1024) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);

  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.byteLength > maxBytes) {
    throw new Error(`File too large (>${Math.round(maxBytes / 1024 / 1024)}MB)`);
  }

  await fs.promises.writeFile(tempFile, buf);
}

async function ocrSpaceByFile(localPath: string) {
  const apiKey = process.env.OCR_SPACE_KEY;
  if (!apiKey) throw new Error("OCR_SPACE_KEY is missing in env");

  const form = new FormData();
  form.append("apikey", apiKey);
  form.append("language", "rus");
  form.append("OCREngine", "2");
  form.append("isOverlayRequired", "false");
  form.append("scale", "true");
  form.append("detectOrientation", "true");
  form.append("file", fs.createReadStream(localPath));

  const resp = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    // @ts-ignore
    body: form,
    // @ts-ignore
    headers: form.getHeaders(),
  });

  const bodyText = await resp.text();

  if (!resp.ok) {
    throw new Error(`OCR.Space HTTP error: ${resp.status}`);
  }

  let data: any;
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new Error("OCR.Space returned non-JSON response");
  }

  if (data?.IsErroredOnProcessing) {
    const msg =
      (Array.isArray(data?.ErrorMessage) && data.ErrorMessage[0]) ||
      data?.ErrorDetails ||
      "OCR.Space: processing error";
    throw new Error(msg);
  }

  return (data?.ParsedResults?.[0]?.ParsedText ?? "").toString();
}

async function tesseractOcrImage(localPath: string) {
  // пробуем rus+kaz, если kaz не установлена — fallback rus
  try {
    const { data } = await Tesseract.recognize(localPath, "rus+kaz", { logger: () => {} });
    return (data?.text ?? "").toString();
  } catch {
    const { data } = await Tesseract.recognize(localPath, "rus", { logger: () => {} });
    return (data?.text ?? "").toString();
  }
}

async function pdfToPngs(pdfPath: string, outDir: string) {
  const opts: any = {
    format: "png",
    out_dir: outDir,
    out_prefix: "page",
    page: null, // все страницы
    // poppler_path: process.env.POPPLER_PATH || "C:\\poppler\\Library\\bin",
  };

  await pdfPoppler.convert(pdfPath, opts);

  const files = await fs.promises.readdir(outDir);
  return files
    .filter((f) => f.toLowerCase().endsWith(".png"))
    .map((f) => path.join(outDir, f))
    .sort();
}

function buildPreviewText(text: string, maxLen = 1200) {
  const t = (text || "").replace(/\s+\n/g, "\n").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen) + "\n…";
}

// ----------------- HANDLER -----------------
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OkResponse | ErrResponse>
) {
    
  // дальше твой код...
  // ✅ всегда JSON
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // ✅ FIX для Vercel: preflight OPTIONS
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  let tempDir: string | null = null;

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { imageUrl, userId, filePath } = req.body as {
      imageUrl?: string; // signedUrl
      userId?: string;
      filePath?: string; // storage path
    };

    if (!imageUrl || !userId || !filePath) {
      return res.status(400).json({ error: "Missing imageUrl or userId or filePath" });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
    if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // 1) Скачиваем файл во временную папку
    const tmpRoot = path.join(process.cwd(), "tmp");
    await fs.promises.mkdir(tmpRoot, { recursive: true });

    const ext = extFromFilePath(filePath);

    tempDir = path.join(tmpRoot, randomUUID());
    await fs.promises.mkdir(tempDir, { recursive: true });

    const tempFile = path.join(tempDir, `input${ext}`);

    await downloadToTemp(imageUrl, tempFile, 12 * 1024 * 1024); // 12MB лимит

    // 2) OCR по типу
    let rawText = "";
    let provider: OkResponse["ocr_provider"] = undefined;

    if (ext === ".pdf") {
      const pngs = await pdfToPngs(tempFile, tempDir);

      if (!pngs.length) {
        return res.status(200).json({
          submitted: false,
          ai_passed: false,
          matches: 0,
          ocr_provider: "tesseract_pdf",
          reason:
            "Не удалось извлечь страницы из PDF. Попробуйте другой файл или сделайте скрин/фото страницы.",
          signals: { pdfPages: 0 },
        });
      }

      // ограничим 2 страницами
      const pagesToScan = pngs.slice(0, 2);

      let combined = "";
      for (const p of pagesToScan) {
        const pageText = await tesseractOcrImage(p);
        combined += "\n" + pageText;
      }

      rawText = combined;
      provider = "tesseract_pdf";
    } else if (isImageExt(ext)) {
      try {
        rawText = await withRetry(() => ocrSpaceByFile(tempFile), 2, 900);
        provider = "ocrspace";
      } catch {
        rawText = await tesseractOcrImage(tempFile);
        provider = "tesseract";
      }
    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    const { matches, ai_passed, signals } = decidePass(rawText);
    const preview = buildPreviewText(rawText);

    // 3) если не похоже — НЕ создаём заявку
    if (!ai_passed) {
      return res.status(200).json({
        submitted: false,
        ai_passed: false,
        matches,
        ocr_provider: provider,
        reason:
          "Документ не похож на студенческий или текст плохо читается. Сделайте фото ближе, без бликов, ровно и при хорошем свете.",
        signals: { ...signals, provider },
      });
    }

    // 4) если уже есть pending — не создаём новую
    const { data: existingPending, error: pendingErr } = await supabaseAdmin
      .from("verification_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(1);

    if (pendingErr) throw new Error(`Pending check error: ${pendingErr.message}`);

    if (!existingPending || existingPending.length === 0) {
      const { error: insertErr } = await supabaseAdmin.from("verification_requests").insert({
        user_id: userId,
        file_path: filePath,
        matches,
        ai_passed,
        status: "pending",
        ocr_text_preview: preview,
        signals: { ...signals, provider, ext },
      });

      if (insertErr) throw new Error(`Insert request error: ${insertErr.message}`);
    }

    // 5) профиль -> pending (если колонка есть)
    await supabaseAdmin
      .from("profiles")
      .update({ verification_status: "pending" })
      .eq("id", userId);

    return res.status(200).json({
      submitted: true,
      ai_passed: true,
      matches,
      request_status: "pending",
      ocr_provider: provider,
      signals: { ...signals, provider, ext },
    });
  } catch (err: any) {
    console.error("[verify-student] ERROR:", err);
    // для фронта лучше всегда JSON
    return res.status(500).json({ error: err?.message || "Unknown error" });
  } finally {
    // cleanup temp dir
    if (tempDir) {
      fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}