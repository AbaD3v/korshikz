"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import {
  FileCheck,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Hourglass,
} from "lucide-react";

type Status = "idle" | "uploading" | "scanning" | "pending" | "verified" | "error";

interface StudentVerifyProps {
  userId: string;
}

export default function StudentVerifyUploader({ userId }: StudentVerifyProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  // 1) Читаем реальный статус из profiles (verified/pending)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingProfile(true);

        const { data, error } = await supabase
          .from("profiles")
          .select("id, is_verified, verification_status")
          .eq("id", userId)
          .single();

        console.log("[Verify] profiles response:", { data, error });

        if (error) throw error;

        const isVerified = Boolean(data?.is_verified);
        const vStatus = String(data?.verification_status || "").toLowerCase();

        if (cancelled) return;

        if (isVerified) {
          setStatus("verified");
          setMessage("Ваш статус студента подтвержден администратором.");
        } else if (vStatus === "pending") {
          setStatus("pending");
          setMessage("Заявка уже отправлена. Ожидайте решения администратора.");
        } else {
          setStatus("idle");
          setMessage("");
        }
      } catch (e) {
        console.error("[Verify] profiles read error:", e);
        if (!cancelled) {
          setStatus("idle");
          setMessage("");
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleVerify = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // чтобы можно было выбрать тот же файл снова
      event.target.value = "";

      const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        setStatus("error");
        setMessage("Поддерживаются только JPG, PNG и PDF");
        return;
      }

      setStatus("uploading");
      setMessage(file.type === "application/pdf" ? "Загрузка PDF документа..." : "Загрузка фото...");

      const fileExt =
        file.name.split(".").pop() ||
        (file.type === "application/pdf" ? "pdf" : "png");

      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      // 1) upload
      const { error: uploadError } = await supabase.storage
        .from("verification-docs")
        .upload(filePath, file, { contentType: file.type, upsert: true });

      console.log("[Verify] upload:", { filePath, uploadError });
      if (uploadError) throw uploadError;

      // 2) signed url
      setMessage("Проверка безопасности...");
      const { data: signedData, error: signedError } = await supabase.storage
        .from("verification-docs")
        .createSignedUrl(filePath, 300);

      console.log("[Verify] signed url:", { signedData, signedError });
      if (signedError) throw signedError;

      // 3) send to backend
      setStatus("scanning");
      setMessage(file.type === "application/pdf" ? "Считываем данные из PDF..." : "ИИ сканирует текст на фото...");

      const res = await fetch("/api/verify-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          filePath,                 // важно для админа
          imageUrl: signedData.signedUrl, // signedUrl только для OCR
        }),
      });

      // safe parse (json or text)
      const contentType = res.headers.get("content-type") || "";
      let result: any = null;

      if (contentType.includes("application/json")) {
        result = await res.json();
      } else {
        const text = await res.text();
        console.log("[Verify] non-json response:", text.slice(0, 400));
        result = { error: `Server returned non-JSON (${res.status})` };
      }

      console.log("[Verify] /api/verify-student response:", { ok: res.ok, status: res.status, result });

      // ---- 503 / other errors ----
      if (!res.ok) {
        setStatus("error");

        const msg =
          result?.reason ||
          result?.error ||
          (res.status === 503
            ? "Сервис распознавания временно недоступен. Попробуйте позже."
            : `Ошибка сервера (${res.status}).`);

        setMessage(msg);
        return;
      }

      // ---- success path: submitted or rejected by bot ----
      if (result?.submitted) {
        setStatus("pending");
        setMessage(
          result.ai_passed
            ? "Заявка отправлена на модерацию. ИИ считает документ корректным — ожидайте решения администратора."
            : "Заявка отправлена на модерацию. ИИ не уверен — администратор проверит вручную."
        );
        return;
      }

      // bot did NOT pass -> don't spam admin
      setStatus("error");
      setMessage(
        result?.reason ||
          `Документ не похож на студенческий (совпадений: ${typeof result?.matches === "number" ? result.matches : 0}). Попробуйте другое фото.`
      );
    } catch (error: any) {
      console.error("[Verify] handleVerify error:", error);
      setStatus("error");
      setMessage(error?.message || "Ошибка связи с сервером");
    }
  };

  // ---------------- UI ----------------

  if (loadingProfile) {
    return (
      <div className="p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
        <Loader2 className="animate-spin text-indigo-600" size={32} strokeWidth={1.5} />
        <p className="text-sm text-neutral-500">Загрузка статуса...</p>
      </div>
    );
  }

  // ✅ Verified (реально админ подтвердил)
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

  // 🕒 Pending (заявка ушла админу)
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

  // idle / uploading / scanning / error
  return (
    <div className="p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 transition-all bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-col items-center gap-2">
        {status === "idle" && <FileCheck className="text-neutral-300" size={48} strokeWidth={1.5} />}
        {(status === "uploading" || status === "scanning") && (
          <Loader2 className="animate-spin text-indigo-600" size={48} strokeWidth={1.5} />
        )}
        {status === "error" && <AlertCircle className="text-red-400" size={48} strokeWidth={1.5} />}
      </div>

      <div className="text-center">
        <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
          {status === "error" ? "Проверка не прошла" : "Верификация студента"}
        </p>
        <p className="text-sm text-neutral-500 mt-1 max-w-[240px]">
          {message || "Загрузите фото студенческого билета (каз/рус) или PDF"}
        </p>
      </div>

      <label
        className={`
          mt-2 px-6 py-2.5 rounded-xl font-medium transition-all active:scale-95 cursor-pointer
          ${status === "error" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-indigo-600 text-white hover:bg-indigo-700"}
          ${(status === "uploading" || status === "scanning") ? "opacity-0 pointer-events-none" : "opacity-100"}
        `}
      >
        {status === "error" ? "Попробовать еще раз" : "Выбрать документ"}
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleVerify}
          className="hidden"
          disabled={status === "uploading" || status === "scanning"}
        />
      </label>

      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-400 uppercase tracking-wider font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        Только вузы Астаны (временно)
      </div>
    </div>
  );
}