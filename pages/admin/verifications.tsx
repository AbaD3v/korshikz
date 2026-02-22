import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import { toast } from "sonner";
import {
  Check,
  X,
  RefreshCcw,
  Search,
  ExternalLink,
  Copy,
  UserRound,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  XCircle,
} from "lucide-react";
import Link from "next/link";

type ProfileMini = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  university?: string | null;
  city?: string | null;
  is_verified?: boolean | null;
  verification_status?: string | null;
  avatar_url?: string | null;
};

type Item = {
  id: string;
  user_id: string;
  file_path: string;
  matches: number;
  ai_passed: boolean;
  status: string;
  created_at: string;

  admin_comment?: string | null;
  ocr_text_preview?: string | null;
  signals?: any;

  profiles?: ProfileMini | null;
};

function safeSignals(s: any) {
  if (!s) return null;
  if (typeof s === "object") return s;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

async function authedFetch(url: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Copy failed");
  }
}

function badgeClass(base: string) {
  return `text-xs px-3 py-1 rounded-full ${base}`;
}

export default function AdminVerificationsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{ title: string; subtitle?: string } | null>(null);

  const closePreview = useCallback(() => {
    setPreviewUrl(null);
    setPreviewMeta(null);
  }, []);

  // ESC closes modal
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePreview();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePreview]);

  async function load() {
    setLoading(true);
    try {
      const r = await authedFetch("/api/admin/verifications/list");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setItems(j.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((it) => {
      const p = it.profiles;
      const hay = [
        it.id,
        it.user_id,
        it.file_path,
        String(it.matches ?? ""),
        String(it.ai_passed ?? ""),
        it.ocr_text_preview ?? "",
        p?.full_name ?? "",
        p?.username ?? "",
        p?.university ?? "",
        p?.city ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [items, query]);

  async function approve(it: Item) {
    const t = toast.loading("Approving...");

    // оптимистично убираем из списка
    setItems((prev) => prev.filter((x) => x.id !== it.id));

    try {
      const r = await authedFetch("/api/admin/verifications/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: it.id }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Approve failed");

      toast.success("Approved", { id: t });
    } catch (e: any) {
      toast.error(e?.message || "Error", { id: t });
      // возвращаем обратно если ошибка
      setItems((prev) => [it, ...prev]);
    }
  }

  async function reject(it: Item) {
    const reason = prompt("Причина отказа (уйдёт пользователю):", "Не похоже на студенческий документ");
    if (reason == null) return; // cancel
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("Нужна причина отказа");
      return;
    }

    const t = toast.loading("Rejecting...");

    // оптимистично убираем из списка
    setItems((prev) => prev.filter((x) => x.id !== it.id));

    try {
      const r = await authedFetch("/api/admin/verifications/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: it.id, adminComment: trimmed }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Reject failed");

      toast.success("Rejected", { id: t });
    } catch (e: any) {
      toast.error(e?.message || "Error", { id: t });
      // возвращаем обратно если ошибка
      setItems((prev) => [it, ...prev]);
    }
  }

  async function openPreview(it: Item) {
    const t = toast.loading("Opening preview...");

    try {
      const r = await authedFetch("/api/admin/verifications/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: it.file_path }),
      });

      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to get signed URL");

      const p = it.profiles;
      const title = p?.full_name || p?.username || it.user_id;
      const subtitle = p?.university ? `${p.university}${p.city ? ` • ${p.city}` : ""}` : p?.city || undefined;

      setPreviewMeta({ title, subtitle });
      setPreviewUrl(j.signedUrl);

      toast.dismiss(t);
    } catch (e: any) {
      toast.error(e?.message || "Preview error", { id: t });
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1117] transition-colors">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Verification moderation
            </h1>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Pending: <span className="font-semibold text-gray-800 dark:text-gray-200">{filtered.length}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={load}
              className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm
                border-gray-300 bg-white hover:bg-gray-50
                dark:border-gray-700 dark:bg-[#1a1d26] dark:hover:bg-[#222531]"
            >
              <RefreshCcw size={16} />
              {loading ? "Loading..." : "Reload"}
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search: id / user / name / university / city / OCR…"
            className="w-full rounded-xl border pl-9 pr-4 py-3 text-sm
              border-gray-300 bg-white
              dark:border-gray-700 dark:bg-[#1a1d26] dark:text-white"
          />
        </div>

        {/* LIST */}
        <div className="mt-6 space-y-4">
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161922] p-6 text-sm text-gray-500 dark:text-gray-400">
              Nothing to moderate.
            </div>
          )}

          {filtered.map((it) => {
            const sig = safeSignals(it.signals);
            const isExpanded = !!expanded[it.id];

            const p = it.profiles;
            const displayName = p?.full_name || p?.username || it.user_id;
            const subtitle = p?.university
              ? `${p.university}${p.city ? ` • ${p.city}` : ""}`
              : p?.city || "";

            return (
              <div
                key={it.id}
                className="rounded-2xl border p-5 transition-all
                  border-gray-200 bg-white
                  dark:border-gray-700 dark:bg-[#161922]"
              >
                {/* TOP */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(it.created_at).toLocaleString()}
                    </div>

                    <div className="mt-1 flex items-center gap-2 min-w-0">
                      <div className="text-base font-semibold text-gray-900 dark:text-white truncate">
                        {displayName}
                      </div>

                      {p?.is_verified && (
                        <span className={badgeClass("bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 flex items-center gap-1")}>
                          <ShieldCheck size={14} />
                          verified
                        </span>
                      )}
                    </div>

                    {subtitle && (
                      <div className="text-sm text-gray-600 dark:text-gray-300 truncate mt-0.5">
                        {subtitle}
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={badgeClass("bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300")}>
                        matches {it.matches}
                      </span>

                      {sig?.hasIdLike && (
                        <span className={badgeClass("bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300")}>
                          id-like
                        </span>
                      )}

                      <span className={badgeClass("bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300")}>
                        {it.file_path.split("/").pop()}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button
                        onClick={() => copyToClipboard(it.user_id)}
                        className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs
                          border-gray-200 bg-white hover:bg-gray-50
                          dark:border-gray-700 dark:bg-[#1a1d26] dark:hover:bg-[#222531]"
                      >
                        <Copy size={14} /> Copy user_id
                      </button>

                      <button
                        onClick={() => copyToClipboard(it.id)}
                        className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs
                          border-gray-200 bg-white hover:bg-gray-50
                          dark:border-gray-700 dark:bg-[#1a1d26] dark:hover:bg-[#222531]"
                      >
                        <Copy size={14} /> Copy request_id
                      </button>

                      <Link
                        href={`/profile/${it.user_id}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs
                          border-gray-200 bg-white hover:bg-gray-50
                          dark:border-gray-700 dark:bg-[#1a1d26] dark:hover:bg-[#222531]"
                      >
                        <UserRound size={14} /> Open profile
                      </Link>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex gap-2 flex-wrap md:justify-end">
                    <button
                      onClick={() => openPreview(it)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm
                        border-gray-300 bg-white hover:bg-gray-50
                        dark:border-gray-700 dark:bg-[#1a1d26] dark:hover:bg-[#222531]"
                    >
                      <ExternalLink size={16} />
                      Preview
                    </button>

                    <button
                      onClick={() => approve(it)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                        bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <Check size={16} />
                      Approve
                    </button>

                    <button
                      onClick={() => reject(it)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                        bg-red-600 text-white hover:bg-red-700"
                    >
                      <X size={16} />
                      Reject
                    </button>
                  </div>
                </div>

                {/* OCR BLOCK */}
                <div className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-[#1d212d]">
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-sm font-medium dark:text-gray-200">
                      OCR text
                    </span>

                    <button
                      onClick={() => setExpanded((p) => ({ ...p, [it.id]: !p[it.id] }))}
                      className="inline-flex items-center gap-2 text-xs text-blue-500 hover:underline"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isExpanded ? "Collapse" : "Expand"}
                    </button>
                  </div>

                  <div
                    className={`mt-3 text-sm leading-relaxed whitespace-pre-wrap 
                      text-gray-800 dark:text-gray-300
                      ${isExpanded ? "" : "line-clamp-6"}`}
                  >
                    {it.ocr_text_preview || "—"}
                  </div>

                  {sig && (
                    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                      <div className="text-xs font-semibold opacity-70 mb-2">
                        Signals
                      </div>
                      <pre className="text-[11px] overflow-auto max-h-40 opacity-90 text-gray-800 dark:text-gray-300">
                        {JSON.stringify(sig, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* PREVIEW MODAL */}
        {previewUrl && (
          <div
            onClick={closePreview}
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-6xl h-[85vh] bg-white dark:bg-[#0f1117] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {previewMeta?.title || "Preview"}
                  </div>
                  {previewMeta?.subtitle && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {previewMeta.subtitle}
                    </div>
                  )}
                </div>

                <button
                  onClick={closePreview}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Close preview"
                >
                  <XCircle className="text-gray-700 dark:text-gray-200" size={18} />
                </button>
              </div>

              <iframe src={previewUrl} className="w-full h-[calc(85vh-52px)]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}