// src/server.ts
import express from "express";
import { createClient } from "@supabase/supabase-js";
import FormData from "form-data";

const app = express();
app.use(express.json({ limit: "1mb" }));

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = process.env.VERIFICATION_BUCKET || "verification-docs";

const RENDER_OCR_SECRET = process.env.RENDER_OCR_SECRET!;
const WORKER_ID = process.env.WORKER_ID || `worker-${Math.random().toString(16).slice(2)}`;

const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY!;
const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS || 45000);
const DOWNLOAD_TIMEOUT_MS = Number(process.env.DOWNLOAD_TIMEOUT_MS || 20000);

const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS || 5);
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 1);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 10000);

// keywords
const KEYWORDS = (process.env.OCR_KEYWORDS || "student,студент,университет,university,студенческий")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function requireWorkerAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m || m[1] !== RENDER_OCR_SECRET) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// быстрый backoff для free tier
function backoff(attempt: number) {
  // 15s, 60s, 5m, 15m, 60m
  const seconds = [15, 60, 300, 900, 3600][Math.min(attempt - 1, 4)];
  return new Date(Date.now() + seconds * 1000);
}

async function fetchWithTimeout(url: string, init: any, timeoutMs: number) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ac.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function downloadFile(signedUrl: string): Promise<Buffer> {
  const res = await fetchWithTimeout(signedUrl, { method: "GET" }, DOWNLOAD_TIMEOUT_MS);
  if (!res.ok) throw new Error(`download_failed:${res.status}`);
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

// OCR.Space: scale=true, engine2 -> engine1 fallback on 5xx
async function ocrSpace(buffer: Buffer): Promise<string> {
  const tryOnce = async (engine: "1" | "2") => {
    const form = new FormData();
    form.append("apikey", OCR_SPACE_API_KEY);
    form.append("language", "rus");
    form.append("isOverlayRequired", "false");
    form.append("scale", "true");
    form.append("OCREngine", engine);
    form.append("file", buffer, { filename: "doc.jpg" });

    const res = await fetchWithTimeout(
      "https://api.ocr.space/parse/image",
      {
        method: "POST",
        // @ts-ignore
        headers: form.getHeaders(),
        body: form as any,
      },
      OCR_TIMEOUT_MS
    );

    if (!res.ok) throw new Error(`ocr_http_${res.status}`);
    const json: any = await res.json();

    if (json?.IsErroredOnProcessing) {
      const msg = json?.ErrorMessage?.[0] || "ocr_error";
      throw new Error(`ocr_failed:${msg}`);
    }

    return String(json?.ParsedResults?.[0]?.ParsedText || "");
  };

  try {
    return await tryOnce("2");
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.startsWith("ocr_http_5")) {
      // fallback engine
      return await tryOnce("1");
    }
    throw e;
  }
}

function keywordMatch(text: string) {
  const t = text.toLowerCase();
  const hits = KEYWORDS.filter((k) => t.includes(k));
  const passed = hits.length >= 2;
  return { passed, hits };
}

async function finalizePending(requestId: string, userId: string, payload: any) {
  await supabaseAdmin
    .from("verification_requests")
    .update({
      status: "pending",
      ai_passed: Boolean(payload.ai_passed),
      matches: payload.matches,
      ocr_text_preview: payload.preview,
      signals: payload.signals,
      locked_at: null,
      locked_by: null,
      next_retry_at: null,
      last_error: null,
    })
    .eq("id", requestId);

  await supabaseAdmin.from("profiles").update({ verification_status: "pending" }).eq("id", userId);
}

async function finalizeRejected(requestId: string, userId: string, reason: string, extra: any = {}) {
  await supabaseAdmin
    .from("verification_requests")
    .update({
      status: "rejected",
      ai_passed: false,
      signals: { ...(extra.signals || {}), reject_reason: reason },
      last_error: reason,
      locked_at: null,
      locked_by: null,
      next_retry_at: null,
    })
    .eq("id", requestId);

  await supabaseAdmin.from("profiles").update({ verification_status: "rejected" }).eq("id", userId);
}

async function retryLater(requestId: string, attemptCount: number, err: string) {
  const next = backoff(attemptCount);
  await supabaseAdmin
    .from("verification_requests")
    .update({
      status: "pending_ocr",
      next_retry_at: next.toISOString(),
      last_error: err,
      locked_at: null,
      locked_by: null,
    })
    .eq("id", requestId);
}

async function processJob(job: any) {
  const requestId = String(job.id);
  const userId = String(job.user_id);
  const filePath = String(job.file_path);
  const attemptCount = Number(job.attempt_count);

  try {
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 120);

    if (signErr || !signed?.signedUrl) {
      throw new Error(`signed_url_failed:${signErr?.message || "no_url"}`);
    }

    const buf = await downloadFile(signed.signedUrl);
    const text = await ocrSpace(buf);

    const preview = text.slice(0, 900);
    const { passed, hits } = keywordMatch(text);

    const signals = {
      worker_id: WORKER_ID,
      attempt: attemptCount,
      keyword_hits: hits,
      text_len: text.length,
      ocr_provider: "ocrspace",
      ts: new Date().toISOString(),
    };

    // Free OCR -> НЕ авто-reject по слабому матчингу.
    // Если текст совсем пустой — тоже лучше отправить админу, а не рубить.
    if (!passed) {
      await finalizePending(requestId, userId, {
        ai_passed: false,
        preview,
        matches: hits,
        signals: { ...signals, weak_match: true },
      });
      return;
    }

    await finalizePending(requestId, userId, {
      ai_passed: true,
      preview,
      matches: hits,
      signals,
    });
  } catch (e: any) {
    const msg = String(e?.message || "processing_error");

    if (attemptCount >= MAX_ATTEMPTS) {
      // после MAX попыток: если OCR стабильно падает — отправим админу, а не reject
      await finalizePending(requestId, userId, {
        ai_passed: false,
        preview: null,
        matches: [],
        signals: { worker_id: WORKER_ID, attempt: attemptCount, last_error: msg, degraded: true },
      });
      return;
    }

    await retryLater(requestId, attemptCount, msg);
  }
}

async function claimBatch(limit: number) {
  const { data, error } = await supabaseAdmin.rpc("claim_verification_jobs", {
    p_limit: limit,
    p_worker_id: WORKER_ID,
  });
  if (error) throw error;
  return (data || []) as any[];
}

async function claimById(requestId: string) {
  const { data, error } = await supabaseAdmin.rpc("claim_verification_job_by_id", {
    p_request_id: requestId,
    p_worker_id: WORKER_ID,
  });
  if (error) throw error;
  return (data || []) as any[];
}

async function runOnce(opts: { requestId?: string } = {}) {
  const jobs = opts.requestId ? await claimById(opts.requestId) : await claimBatch(BATCH_SIZE);
  for (const job of jobs) await processJob(job);
  return jobs.length;
}

app.get("/health", (_req, res) => res.json({ ok: true, worker: WORKER_ID }));

app.post("/process-ocr", requireWorkerAuth, async (req, res) => {
  try {
    const requestId = req.body?.requestId ? String(req.body.requestId) : undefined;
    const count = await runOnce({ requestId });
    res.json({ ok: true, claimed: count });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? "error" });
  }
});

app.listen(Number(process.env.PORT || 3000), () => {
  setInterval(() => {
    runOnce().catch(() => {});
  }, POLL_INTERVAL_MS);

  runOnce().catch(() => {});
  // eslint-disable-next-line no-console
  console.log(`OCR worker up: ${WORKER_ID}`);
});