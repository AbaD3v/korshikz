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

const OCRAPI_KEY = process.env.OCRAPI_KEY || "";
const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || "";

const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS || 45000);
const DOWNLOAD_TIMEOUT_MS = Number(process.env.DOWNLOAD_TIMEOUT_MS || 20000);

const OCRAPI_MAX_WAIT_MS = Number(process.env.OCRAPI_MAX_WAIT_MS || 25000);
const OCRAPI_POLL_MS = Number(process.env.OCRAPI_POLL_MS || 1500);

const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS || 3);
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 1);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 10000);

const KEYWORDS = (process.env.OCR_KEYWORDS || "student,студент,университет,university,студенческий,студбилет,идентификац")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Строже “якоря” — если есть хоть один, вероятность что это документ выше
const ANCHORS = (process.env.OCR_ANCHORS || "студент,студенчес,университет,колледж,faculty,student,university,идентификац,карта,билет")
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
  const seconds = [15, 60, 300][Math.min(attempt - 1, 2)];
  return new Date(Date.now() + seconds * 1000);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

async function downloadFile(signedUrl: string): Promise<Buffer> {
  const res = await fetchWithTimeout(signedUrl, { method: "GET" }, DOWNLOAD_TIMEOUT_MS);
  if (!res.ok) throw new Error(`download_failed:${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** OCRAPI.cloud submit + poll (logs). */
async function ocrOcrApiCloud(fileUrl: string): Promise<{ text: string; provider: string }> {
  if (!OCRAPI_KEY) throw new Error("ocrapi_missing_key");

  console.log("[OCRAPI] submit job...");
  const submitRes = await fetchWithTimeout(
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
      }),
    },
    15000
  );

  const submitBodyText = await submitRes.text().catch(() => "");
  console.log("[OCRAPI] submit status:", submitRes.status);
  if (submitBodyText) console.log("[OCRAPI] submit body:", submitBodyText.slice(0, 500));

  if (!submitRes.ok) throw new Error(`ocrapi_submit_http_${submitRes.status}`);

  let submitJson: any = null;
  try {
    submitJson = submitBodyText ? JSON.parse(submitBodyText) : await submitRes.json();
  } catch {}

  const jobId = String(submitJson?.job_id || submitJson?.id || "");
  if (!jobId) throw new Error("ocrapi_no_job_id");

  console.log("[OCRAPI] job_id:", jobId);

  const started = Date.now();
  while (Date.now() - started < OCRAPI_MAX_WAIT_MS) {
    await sleep(OCRAPI_POLL_MS);

    const pollRes = await fetchWithTimeout(
      `https://ocrapi.cloud/api/v1/jobs/${encodeURIComponent(jobId)}`,
      { method: "GET", headers: { Authorization: `Bearer ${OCRAPI_KEY}` } },
      15000
    );

    const pollText = await pollRes.text().catch(() => "");
    console.log("[OCRAPI] poll status:", pollRes.status);

    if (!pollRes.ok) {
      if (pollText) console.log("[OCRAPI] poll body:", pollText.slice(0, 300));
      throw new Error(`ocrapi_poll_http_${pollRes.status}`);
    }

    let pollJson: any = null;
    try {
      pollJson = pollText ? JSON.parse(pollText) : await pollRes.json();
    } catch {}

    const st = String(pollJson?.status || "").toLowerCase();
    console.log("[OCRAPI] job status:", st);

    if (["completed", "complete", "done", "finished", "success"].includes(st)) {
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

      console.log("[OCRAPI] completed. text_len:", String(text).length);
      return { text: String(text), provider: "ocrapi.cloud" };
    }

    if (["failed", "error"].includes(st)) {
      console.log("[OCRAPI] failed payload:", JSON.stringify(pollJson)?.slice(0, 500));
      throw new Error(`ocrapi_failed:${pollJson?.error || pollJson?.message || "unknown"}`);
    }
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
    const t = await tryOnce("2");
    console.log("[OCRSPACE] ok engine=2 len:", t.length);
    return { text: t, provider: "ocr.space" };
  } catch (e: any) {
    const msg = String(e?.message || "");
    console.log("[OCRSPACE] failed engine=2:", msg);
    if (msg.startsWith("ocrspace_http_5")) {
      const t = await tryOnce("1");
      console.log("[OCRSPACE] ok engine=1 len:", t.length);
      return { text: t, provider: "ocr.space" };
    }
    throw e;
  }
}

function analyzeText(text: string) {
  const t = text || "";
  const lower = t.toLowerCase();

  const letters = (t.match(/[a-zа-яёәіңғүұқөһ]/gi) || []).length;
  const cyr = (t.match(/[а-яёәіңғүұқөһ]/gi) || []).length;
  const lat = (t.match(/[a-z]/gi) || []).length;
  const digits = (t.match(/[0-9]/g) || []).length;

  const keywordHits = KEYWORDS.filter((k) => lower.includes(k));
  const anchorHits = ANCHORS.filter((k) => lower.includes(k));

  return { len: t.length, letters, cyr, lat, digits, keywordHits, anchorHits };
}

/**
 * Для ~15% ложных отказов:
 * - reject только при явном мусоре (очень коротко / почти нет букв / почти нет цифр)
 * - если текст нормальной длины -> не режем, уходит админу
 */
function decideAutoReject(a: ReturnType<typeof analyzeText>) {
  const hardReject =
    a.len < 35 ||                 // почти пусто
    a.letters < 12 ||             // нет текста
    a.digits < 2 ||               // у доков почти всегда есть цифры/номера/даты
    (a.anchorHits.length === 0 && a.len < 140); // нет “якорей” и текст короткий

  // “passed” для ускорения админом (не авто-approve!)
  const passed =
    a.anchorHits.length >= 1 &&
    a.keywordHits.length >= 2 &&
    a.len >= 140 &&
    a.digits >= 3;

  return { hardReject, passed };
}

async function setProfileStatus(userId: string, status: "pending" | "rejected") {
  await supabaseAdmin.from("profiles").update({ verification_status: status }).eq("id", userId);
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
      last_error: payload.last_error ?? null,
      admin_comment: payload.admin_comment ?? null,
    })
    .eq("id", requestId);

  await setProfileStatus(userId, "pending");
}

async function finalizeRejected(requestId: string, userId: string, payload: any) {
  await supabaseAdmin
    .from("verification_requests")
    .update({
      status: "rejected",
      ai_passed: false,
      matches: payload.matches ?? [],
      ocr_text_preview: payload.preview ?? null,
      signals: payload.signals ?? {},
      admin_comment:
        payload.admin_comment ||
        "Документ не похож на студенческий билет. Попробуйте загрузить фото четче.",
      locked_at: null,
      locked_by: null,
      next_retry_at: null,
      last_error: payload.last_error ?? null,
    })
    .eq("id", requestId);

  await setProfileStatus(userId, "rejected");
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

  console.log("[JOB] start", { requestId, attemptCount, filePath });

  try {
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 120);

    if (signErr || !signed?.signedUrl) throw new Error(`signed_url_failed:${signErr?.message || "no_url"}`);

    const signedUrl = signed.signedUrl;

    let text = "";
    let provider = "none";
    let ocrapiErr: string | null = null;

    // main: OCRAPI.cloud
    try {
      const r = await ocrOcrApiCloud(signedUrl);
      text = r.text;
      provider = r.provider;
    } catch (e1: any) {
      ocrapiErr = String(e1?.message || e1);
      console.log("[OCRAPI] failed:", ocrapiErr);

      // fallback OCR.Space
      provider = "ocr.space";
      const buf = await downloadFile(signedUrl);
      const r2 = await ocrOcrSpace(buf);
      text = r2.text;
      provider = r2.provider;
    }

    const preview = (text || "").slice(0, 900) || null;
    const a = analyzeText(text || "");
    const { hardReject, passed } = decideAutoReject(a);

    const signals = {
      worker_id: WORKER_ID,
      attempt: attemptCount,
      ocr_provider: provider,
      ocrapi_error: ocrapiErr,
      keyword_hits: a.keywordHits,
      anchor_hits: a.anchorHits,
      text_len: a.len,
      letters: a.letters,
      digits: a.digits,
      cyr: a.cyr,
      lat: a.lat,
      ts: new Date().toISOString(),
    };

    console.log("[JOB] analyzed", { requestId, provider, ...a, hardReject, passed });

    // ✅ AUTO-REJECT только по hardReject (явный мусор)
    if (hardReject) {
      await finalizeRejected(requestId, userId, {
        matches: a.keywordHits,
        preview,
        signals: { ...signals, reject_reason: "hard_reject" },
        last_error: null,
        admin_comment: "Документ не похож на студенческий билет. Загрузите фото четче (видны текст и номер).",
      });
      console.log("[JOB] rejected (hard)", { requestId });
      return;
    }

    // иначе — pending админу. ai_passed помогает в админке (ускорить approve)
    await finalizePending(requestId, userId, {
      ai_passed: passed,
      preview,
      matches: a.keywordHits,
      signals: passed ? signals : { ...signals, weak_match: true },
      last_error: null,
    });

    console.log("[JOB] pending", { requestId, ai_passed: passed, provider });
  } catch (e: any) {
    const msg = String(e?.message || "processing_error");
    console.log("[JOB] error", { requestId, msg });

    // OCR/скачивание/подпись упали — НЕ reject. Это не вина пользователя.
    if (isOcrRelatedError(msg)) {
      await finalizePending(requestId, userId, {
        ai_passed: false,
        preview: null,
        matches: [],
        signals: {
          worker_id: WORKER_ID,
          attempt: attemptCount,
          ocr_provider: msg.startsWith("ocrspace_") ? "ocr.space" : "none",
          last_error: msg,
          degraded: true,
          ts: new Date().toISOString(),
        },
        last_error: msg,
        admin_comment: "OCR временно недоступен — заявка отправлена на ручную проверку.",
      });
      return;
    }

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
        last_error: msg,
        admin_comment: "Не удалось обработать документ автоматически — отправлено на ручную проверку.",
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