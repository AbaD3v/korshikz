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

const OCRAPI_KEY = process.env.OCRAPI_KEY || ""; // main
const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || ""; // fallback

const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS || 45000);
const DOWNLOAD_TIMEOUT_MS = Number(process.env.DOWNLOAD_TIMEOUT_MS || 20000);

const OCRAPI_MAX_WAIT_MS = Number(process.env.OCRAPI_MAX_WAIT_MS || 25000);
const OCRAPI_POLL_MS = Number(process.env.OCRAPI_POLL_MS || 1500);

const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS || 3);
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 1);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 10000);

const KEYWORDS = (process.env.OCR_KEYWORDS || "student,студент,университет,university,студенческий")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
console.log("OCRAPI_KEY exists:", !!process.env.OCRAPI_KEY);
console.log("OCR_SPACE_API_KEY exists:", !!process.env.OCR_SPACE_API_KEY);
function requireWorkerAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m || m[1] !== RENDER_OCR_SECRET) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function backoff(attempt: number) {
  // 15s, 60s, 5m
  const seconds = [15, 60, 300][Math.min(attempt - 1, 2)];
  return new Date(Date.now() + seconds * 1000);
}

async function fetchWithTimeout(url: string, init: any, timeoutMs: number) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadFile(signedUrl: string): Promise<Buffer> {
  const res = await fetchWithTimeout(signedUrl, { method: "GET" }, DOWNLOAD_TIMEOUT_MS);
  if (!res.ok) throw new Error(`download_failed:${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * OCRAPI.cloud (submit + poll). We treat response structure defensively.
 * Endpoints (per OCRAPI.cloud docs/site): /api/v1/jobs and /api/v1/jobs/{job_id}
 */
async function ocrOcrApiCloud(fileUrl: string): Promise<{ text: string; provider: string }> {
  if (!OCRAPI_KEY) throw new Error("ocrapi_missing_key");

  const submit = await fetchWithTimeout(
    "https://ocrapi.cloud/api/v1/jobs",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OCRAPI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_url: fileUrl,
        language: "ru",
        extract_tables: false,
      }),
    },
    15000
  );

  if (!submit.ok) throw new Error(`ocrapi_submit_http_${submit.status}`);
  const submitJson: any = await submit.json().catch(() => null);

  const jobId = String(submitJson?.job_id || submitJson?.id || "");
  if (!jobId) throw new Error("ocrapi_no_job_id");

  const started = Date.now();
  while (Date.now() - started < OCRAPI_MAX_WAIT_MS) {
    await sleep(OCRAPI_POLL_MS);

    const poll = await fetchWithTimeout(
      `https://ocrapi.cloud/api/v1/jobs/${encodeURIComponent(jobId)}`,
      { method: "GET", headers: { Authorization: `Bearer ${OCRAPI_KEY}` } },
      15000
    );

    if (!poll.ok) throw new Error(`ocrapi_poll_http_${poll.status}`);
    const pollJson: any = await poll.json().catch(() => null);

    const status = String(pollJson?.status || "").toLowerCase();

    if (["completed", "complete", "done", "finished", "success"].includes(status)) {
      const candidates: any[] = [
        pollJson?.text,
        pollJson?.result?.text,
        pollJson?.result?.full_text,
        pollJson?.data?.text,
        Array.isArray(pollJson?.pages)
          ? pollJson.pages.map((p: any) => p?.text).filter(Boolean).join("\n")
          : null,
      ];

      const text =
        candidates.find((x) => typeof x === "string" && x.trim().length > 0) || "";

      return { text: String(text), provider: "ocrapi.cloud" };
    }

    if (["failed", "error"].includes(status)) {
      throw new Error(`ocrapi_failed:${pollJson?.error || pollJson?.message || "unknown"}`);
    }
    // pending/processing -> continue
  }

  throw new Error("ocrapi_timeout");
}

/** OCR.Space fallback */
async function ocrOcrSpace(buffer: Buffer): Promise<{ text: string; provider: string }> {
  if (!OCR_SPACE_API_KEY) throw new Error("ocrspace_missing_key");

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

    if (!res.ok) throw new Error(`ocrspace_http_${res.status}`);
    const json: any = await res.json();

    if (json?.IsErroredOnProcessing) {
      const msg = json?.ErrorMessage?.[0] || "ocr_error";
      throw new Error(`ocrspace_failed:${msg}`);
    }

    return String(json?.ParsedResults?.[0]?.ParsedText || "");
  };

  try {
    return { text: await tryOnce("2"), provider: "ocr.space" };
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.startsWith("ocrspace_http_5")) {
      return { text: await tryOnce("1"), provider: "ocr.space" };
    }
    throw e;
  }
}

function keywordMatch(text: string) {
  const t = (text || "").toLowerCase();
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
      matches: payload.matches ?? [],
      ocr_text_preview: payload.preview ?? null,
      signals: payload.signals ?? {},
      locked_at: null,
      locked_by: null,
      next_retry_at: null,
      last_error: null,
    })
    .eq("id", requestId);

  await supabaseAdmin.from("profiles").update({ verification_status: "pending" }).eq("id", userId);
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

function isOcrRelatedError(msg: string) {
  return (
    msg.includes("ocrapi_") ||
    msg.includes("ocrspace_") ||
    msg.includes("download_failed") ||
    msg.includes("signed_url_failed")
  );
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

    const signedUrl = signed.signedUrl;

    // ---- OCR providers chain ----
    let text = "";
    let provider = "none";

    // main: OCRAPI.cloud
    try {
      const r = await ocrOcrApiCloud(signedUrl);
      text = r.text;
      provider = r.provider;
    } catch (e1: any) {
      // fallback: OCR.Space (download + multipart)
      const buf = await downloadFile(signedUrl);
      const r2 = await ocrOcrSpace(buf);
      text = r2.text;
      provider = r2.provider;
    }

    const preview = (text || "").slice(0, 900) || null;
    const { passed, hits } = keywordMatch(text || "");

    const signals = {
      worker_id: WORKER_ID,
      attempt: attemptCount,
      ocr_provider: provider,
      keyword_hits: hits,
      text_len: (text || "").length,
      ts: new Date().toISOString(),
    };

    // ✅ Финальное правило: НИКОГДА не auto-reject из воркера.
    // Даже слабое OCR -> pending админу.
    await finalizePending(requestId, userId, {
      ai_passed: passed,
      preview,
      matches: hits,
      signals: passed ? signals : { ...signals, weak_match: true },
    });
  } catch (e: any) {
    const msg = String(e?.message || "processing_error");

    // ✅ Free-tier resilience: если OCR/скачивание/подпись падают — НЕ держим юзера.
    // Быстро деградируем в pending админу.
    if (isOcrRelatedError(msg)) {
      await finalizePending(requestId, userId, {
        ai_passed: false,
        preview: null,
        matches: [],
        signals: {
          worker_id: WORKER_ID,
          attempt: attemptCount,
          ocr_provider: "none",
          last_error: msg,
          degraded: true,
          ts: new Date().toISOString(),
        },
      });
      return;
    }

    // прочие ошибки — ретраи ограниченно
    if (attemptCount >= MAX_ATTEMPTS) {
      await finalizePending(requestId, userId, {
        ai_passed: false,
        preview: null,
        matches: [],
        signals: {
          worker_id: WORKER_ID,
          attempt: attemptCount,
          ocr_provider: "none",
          last_error: msg,
          degraded: true,
          ts: new Date().toISOString(),
        },
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
  console.log(`OCR worker up: ${WORKER_ID}`);
});