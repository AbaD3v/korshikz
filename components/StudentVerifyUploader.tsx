"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import { FileCheck, Loader2, ShieldCheck, AlertCircle, Hourglass } from "lucide-react";

type Status = "idle" | "uploading" | "processing" | "pending" | "verified" | "error";

const LS_KEY = "korshi_verify_request_id";
const MAX_ATTEMPTS = 5;

function fmtCountdownMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}с`;
  return `${m}м ${r}с`;
}

export default function StudentVerifyUploader() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [requestId, setRequestId] = useState<string | null>(null);

  const pollRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const getAuthedUserId = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user?.id) throw new Error("Вы не авторизованы");
    return user.id;
  };

  const clearLocalRequest = () => {
    localStorage.removeItem(LS_KEY);
    setRequestId(null);
  };

  const setTerminalError = (text: string) => {
    stopPolling();
    clearLocalRequest();
    setStatus("error");
    setMessage(text);
  };

  const refreshProfile = async () => {
    const userId = await getAuthedUserId();

    const { data, error } = await supabase
      .from("profiles")
      .select("is_verified, verification_status")
      .eq("id", userId)
      .single();

    if (error) throw error;

    const isVerified = Boolean(data?.is_verified);
    const vStatus = String(data?.verification_status || "").toLowerCase();

    if (isVerified) {
      stopPolling();
      clearLocalRequest();
      setStatus("verified");
      setMessage("Ваш статус студента подтвержден администратором.");
      return;
    }

    // profile.pending = заявка точно в админке
    if (vStatus === "pending") {
      setStatus("pending");
      setMessage("Заявка отправлена. Ожидайте решения администратора.");
      return;
    }

    setStatus("idle");
    setMessage("");
  };

  const startPollingRequest = (rid: string) => {
    stopPolling();

    pollRef.current = window.setInterval(async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const res = await fetch(`/api/verification-status?requestId=${encodeURIComponent(rid)}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        // если API временно недоступен — fallback по профилю, UI не роняем
        if (!res.ok) {
          await refreshProfile().catch(() => {});
          return;
        }

        const json = await res.json().catch(() => null);
        const req = json?.request;
        const st = String(req?.status || "").toLowerCase();

        if (st === "pending_ocr" || st === "processing") {
          const attemptCount = Number(json?.meta?.attemptCount ?? req?.attempt_count ?? 0);
          const nextRetryAtRaw = json?.meta?.nextRetryAt ?? req?.next_retry_at;
          const lastError = String(json?.meta?.lastError ?? req?.last_error ?? "");

          setStatus("processing");

          // если есть next_retry_at — покажем таймер
          if (nextRetryAtRaw) {
            const nextMs = new Date(String(nextRetryAtRaw)).getTime() - Date.now();
            const left = fmtCountdownMs(nextMs);
            const att = attemptCount ? `Попытка ${attemptCount}/${MAX_ATTEMPTS}.` : "";
            const err = lastError ? ` (${lastError})` : "";
            setMessage(`OCR временно недоступен. Повторная попытка через ${left}. ${att}${err}`);
          } else {
            const att = attemptCount ? ` (попытка ${attemptCount}/${MAX_ATTEMPTS})` : "";
            setMessage(`Проверяем документ (OCR)…${att}`);
          }

          return;
        }

        if (st === "pending") {
          setStatus("pending");
          setMessage("Заявка отправлена. Ожидайте решения администратора.");
          return;
        }

        if (st === "approved") {
          stopPolling();
          clearLocalRequest();
          setStatus("verified");
          setMessage("Ваш статус студента подтвержден администратором.");
          return;
        }

        if (st === "rejected") {
          setTerminalError(req?.admin_comment || "Заявка отклонена.");
          return;
        }

        // неожиданный статус — сверим профиль
        await refreshProfile().catch(() => {});
      } catch {
        // silent
      }
    }, 3000);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        const saved = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
        if (saved) {
          setRequestId(saved);
          setStatus("processing");
          setMessage("Продолжаем проверку документа…");
          startPollingRequest(saved);
        }

        await refreshProfile();
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      event.target.value = "";

      // если уже в процессе — не спамим
      if (status === "pending" || status === "processing") return;

      const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        setStatus("error");
        setMessage("Поддерживаются только JPG, PNG и PDF");
        return;
      }

      const userId = await getAuthedUserId();

      setStatus("uploading");
      setMessage(file.type === "application/pdf" ? "Загрузка PDF документа..." : "Загрузка фото...");

      const fileExt =
        file.name.split(".").pop() || (file.type === "application/pdf" ? "pdf" : "png");

      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("verification-docs")
        .upload(filePath, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const token = await getToken();
      if (!token) {
        setTerminalError("Сессия истекла. Перезайдите и попробуйте снова.");
        return;
      }

      setStatus("processing");
      setMessage("Документ отправлен. Идёт распознавание текста (OCR)…");

      const res = await fetch("/api/verify-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filePath }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        setTerminalError(result?.error || `Ошибка сервера (${res.status}).`);
        return;
      }

      const rid = String(result?.requestId || "");
      if (!rid) {
        setTerminalError("Не удалось отправить документ на проверку.");
        return;
      }

      setRequestId(rid);
      localStorage.setItem(LS_KEY, rid);
      startPollingRequest(rid);
    } catch (e: any) {
      setTerminalError(e?.message || "Ошибка связи с сервером");
    }
  };

  // UI
  if (loading) {
    return (
      <div className="p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
        <Loader2 className="animate-spin text-indigo-600" size={32} strokeWidth={1.5} />
        <p className="text-sm text-neutral-500">Загрузка статуса...</p>
      </div>
    );
  }

  if (status === "verified") {
    return (
      <div className="p-6 border rounded-2xl flex flex-col items-center justify-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900">
        <ShieldCheck className="text-emerald-600" size={56} strokeWidth={1.5} />
        <p className="font-bold text-lg text-emerald-700 dark:text-emerald-300">Вы верифицированы</p>
        <p className="text-sm text-emerald-700/70 dark:text-emerald-200/70 text-center">
          {message || "Ваш статус студента подтвержден"}
        </p>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="p-6 border rounded-2xl flex flex-col items-center justify-center gap-3 bg-indigo-50 dark:bg-indigo-950/25 border-indigo-200 dark:border-indigo-900">
        <Hourglass className="text-indigo-600" size={56} strokeWidth={1.5} />
        <p className="font-bold text-lg text-indigo-700 dark:text-indigo-300">Заявка на модерации</p>
        <p className="text-sm text-indigo-700/70 dark:text-indigo-200/70 text-center">
          {message || "Ожидайте решения администратора"}
        </p>
        <p className="text-[11px] text-indigo-700/60 dark:text-indigo-200/60 uppercase tracking-wider font-bold">
          Обычно это занимает немного времени
        </p>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="p-6 border rounded-2xl flex flex-col items-center justify-center gap-3 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
        <Loader2 className="animate-spin text-indigo-600" size={48} strokeWidth={1.5} />
        <p className="font-bold text-lg text-neutral-800 dark:text-neutral-200">Проверяем документ…</p>
        <p className="text-sm text-neutral-500 text-center max-w-[300px]">
          {message || "Идёт распознавание текста (OCR). Пожалуйста, подождите…"}
        </p>
        {requestId && (
          <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-bold">
            ID: {requestId.slice(0, 8)}…
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 transition-all bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-col items-center gap-2">
        {status === "idle" && <FileCheck className="text-neutral-300" size={48} strokeWidth={1.5} />}
        {status === "uploading" && <Loader2 className="animate-spin text-indigo-600" size={48} strokeWidth={1.5} />}
        {status === "error" && <AlertCircle className="text-red-400" size={48} strokeWidth={1.5} />}
      </div>

      <div className="text-center">
        <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
          {status === "error" ? "Проверка не прошла" : "Верификация студента"}
        </p>
        <p className="text-sm text-neutral-500 mt-1 max-w-[300px]">
          {message || "Загрузите фото студенческого билета (каз/рус) или PDF"}
        </p>
      </div>

      <label
        className={`
          mt-2 px-6 py-2.5 rounded-xl font-medium transition-all active:scale-95 cursor-pointer
          ${status === "error" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-indigo-600 text-white hover:bg-indigo-700"}
          ${status === "uploading" ? "opacity-0 pointer-events-none" : "opacity-100"}
        `}
      >
        {status === "error" ? "Попробовать еще раз" : "Выбрать документ"}
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleVerify}
          className="hidden"
          disabled={status === "uploading"}
        />
      </label>

      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-400 uppercase tracking-wider font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        Только вузы Астаны (временно)
      </div>
    </div>
  );
}