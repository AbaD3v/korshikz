import express from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import FormData from "form-data";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OCR_SPACE_KEY = process.env.OCR_SPACE_KEY!;
const SECRET = process.env.RENDER_OCR_SECRET!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

const KEYWORDS = [
  "студенттік","студенческий","студент","билет","университет","university","колледж","college",
  "факультет","faculty","student","student id","бакалавр","магистратура",
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
function hasDocMarker(text: string) { return DOC_MARKERS.some((re) => re.test(text || "")); }
function hasIdLikeNumber(text: string) { return /\b\d{6,12}\b/.test(text || ""); }

function decidePass(text: string) {
  const matches = countKeywords(text);
  const marker = hasDocMarker(text);
  const idLike = hasIdLikeNumber(text);
  const ai_passed = matches >= 2 && (marker || idLike);
  return { matches, ai_passed, signals: { hasMarker: marker, hasIdLike: idLike, keywordsMatched: matches } };
}

function buildPreviewText(text: string, maxLen = 1400) {
  const t = (text || "").replace(/\s+\n/g, "\n").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen) + "\n…";
}

async function fetchWithTimeout(url: string, options: any, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function downloadToTemp(url: string, tempFile: string, maxBytes = 12 * 1024 * 1024) {
  const resp = await fetchWithTimeout(url, {}, 12000);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);

  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.byteLength > maxBytes) throw new Error(`File too large (> ${Math.round(maxBytes/1024/1024)}MB)`);

  await fs.promises.writeFile(tempFile, buf);
}

async function ocrSpaceByFile(localPath: string) {
  const form = new FormData();
  form.append("apikey", OCR_SPACE_KEY);
  form.append("language", "rus");
  form.append("OCREngine", "2");
  form.append("isOverlayRequired", "false");
  form.append("scale", "true");
  form.append("detectOrientation", "true");
  form.append("file", fs.createReadStream(localPath));

  const resp = await fetchWithTimeout("https://api.ocr.space/parse/image", {
    method: "POST",
    // @ts-ignore
    body: form,
    // @ts-ignore
    headers: form.getHeaders(),
  }, 12000);

  const bodyText = await resp.text();
  if (!resp.ok) throw new Error(`OCR.Space HTTP error: ${resp.status}`);

  let data: any;
  try { data = JSON.parse(bodyText); } catch { throw new Error("OCR.Space returned non-JSON"); }

  if (data?.IsErroredOnProcessing) {
    const msg =
      (Array.isArray(data?.ErrorMessage) && data.ErrorMessage[0]) ||
      data?.ErrorDetails ||
      "OCR.Space: processing error";
    throw new Error(msg);
  }

  return (data?.ParsedResults?.[0]?.ParsedText ?? "").toString();
}

function assertSecret(req: express.Request) {
  const auth = req.header("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token && token === SECRET;
}

app.post("/process-ocr", async (req, res) => {
  if (!assertSecret(req)) return res.status(401).json({ error: "Unauthorized" });

  const { requestId, userId, filePath } = req.body as { requestId?: string; userId?: string; filePath?: string };
  if (!requestId || !userId || !filePath) return res.status(400).json({ error: "Missing requestId/userId/filePath" });

  const tmpRoot = process.env.TMPDIR || "/tmp";
  const tempDir = path.join(tmpRoot, randomUUID());

  try {
    await fs.promises.mkdir(tempDir, { recursive: true });

    // ставим processing
    await supabaseAdmin.from("verification_requests").update({
      signals: { stage: "processing" },
    }).eq("id", requestId).eq("user_id", userId);

    // signed url на файл (private bucket)
    const { data: signed, error: signErr } = await supabaseAdmin
      .storage
      .from("verification-docs")
      .createSignedUrl(filePath, 300);

    if (signErr || !signed?.signedUrl) throw new Error("Failed to create signed url");

    const tempFile = path.join(tempDir, "input.jpg");
    await downloadToTemp(signed.signedUrl, tempFile);

    // OCR с таймаутом (только OCR.Space тут)
    const rawText = await ocrSpaceByFile(tempFile);

    const preview = buildPreviewText(rawText);
    const { matches, ai_passed, signals } = decidePass(rawText);

    if (!ai_passed) {
      await supabaseAdmin.from("verification_requests").update({
        matches,
        ai_passed,
        status: "rejected", // или "rejected_ai" если добавишь отдельный статус
        ocr_text_preview: preview,
        signals: { ...signals, provider: "ocrspace" },
        admin_comment: "Auto-rejected: not enough signals",
      }).eq("id", requestId).eq("user_id", userId);

      return res.status(200).json({ ok: true, ai_passed: false });
    }

    // прошло AI → отправляем в админ pending
    await supabaseAdmin.from("verification_requests").update({
      matches,
      ai_passed,
      status: "pending",
      ocr_text_preview: preview,
      signals: { ...signals, provider: "ocrspace" },
    }).eq("id", requestId).eq("user_id", userId);

    return res.status(200).json({ ok: true, ai_passed: true });
  } catch (e: any) {
    await supabaseAdmin.from("verification_requests").update({
      status: "pending", // или "ocr_failed"
      admin_comment: `OCR failed: ${e?.message ?? "unknown"}`,
      signals: { stage: "failed" },
    }).eq("id", requestId).eq("user_id", userId);

    return res.status(500).json({ error: e?.message ?? "OCR worker error" });
  } finally {
    fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

app.get("/health", (_, res) => res.json({ ok: true }));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log("OCR worker running on", port));