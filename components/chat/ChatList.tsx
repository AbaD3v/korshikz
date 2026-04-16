"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/hooks/utils/supabase/client";
import {
  MessageSquare,
  ShieldCheck,
  GraduationCap,
  ChevronRight,
  Search,
} from "lucide-react";

type RawMessage = {
  conversation_id: string | null;
  sender_id: string;
  receiver_id: string;
  body: string | null;
  created_at: string | null;
  metadata?: any;
  is_read?: boolean | null;
};

type ProfileMini = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  university?: { id: string; name: string } | null;
  is_verified?: boolean | null;
};

const pickRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

type DialogItem = {
  conversation_id: string;
  other_user: string;
  lastMessage: string;
  lastAt: string | null;
  unread: number;
  otherName: string;
  otherAvatar: string | null;
  otherUniversity: string | null;
  otherVerified: boolean;
  preview: string;
  timeLabel: string;
};

function formatTimeLabel(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();

  const sameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  if (sameDay) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function ChatList() {
  const [dialogs, setDialogs] = useState<DialogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const loadDialogs = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        setDialogs([]);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: messages, error } = await supabase
        .from("messages")
        .select(
          "conversation_id, sender_id, receiver_id, body, created_at, metadata, is_read"
        )
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load messages:", error);
        setDialogs([]);
        setLoading(false);
        return;
      }

      const convMap = new Map<string, Omit<DialogItem, "otherName" | "otherAvatar" | "otherUniversity" | "otherVerified" | "preview" | "timeLabel">>();

      for (const msg of (messages || []) as RawMessage[]) {
        const convId = msg.conversation_id;
        if (!convId) continue;

        const otherUser =
          msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

        if (!otherUser || otherUser === user.id) continue;

        if (!convMap.has(convId)) {
          convMap.set(convId, {
            conversation_id: convId,
            other_user: otherUser,
            lastMessage: msg.body ?? "",
            lastAt: msg.created_at ?? null,
            unread: 0,
          });
        }

        const isIncoming = msg.receiver_id === user.id;

        let alreadyRead = Boolean(msg.is_read);

        try {
          const readBy = msg?.metadata?.read_by;
          if (Array.isArray(readBy)) {
            alreadyRead = readBy.includes(user.id);
          }
        } catch {
          // ignore malformed metadata
        }

        if (isIncoming && !alreadyRead) {
          const entry = convMap.get(convId);
          if (entry) {
            entry.unread += 1;
            convMap.set(convId, entry);
          }
        }
      }

      const convArray = Array.from(convMap.values());

      const otherUserIds = Array.from(
        new Set(convArray.map((c) => c.other_user).filter(Boolean))
      );

      let profiles: ProfileMini[] = [];
      if (otherUserIds.length > 0) {
        const { data: profilesData, error: profErr } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, is_verified, university:universities(id, name)")
          .in("id", otherUserIds);

        if (profErr) {
          console.error("Profiles fetch error:", profErr);
        } else {
          profiles = ((profilesData || []) as any[]).map((profile) => ({
            ...profile,
            university: pickRelation(profile.university),
          })) as ProfileMini[];
        }
      }

      const profilesMap = new Map(profiles.map((p) => [p.id, p]));

      const enriched: DialogItem[] = convArray
        .map((c) => {
          const prof = profilesMap.get(c.other_user) || null;
          const otherName =
            prof?.full_name || `Пользователь ${c.other_user.slice(0, 6)}`;
          const otherAvatar = prof?.avatar_url || null;
          const otherUniversity = prof?.university?.name || null;
          const otherVerified = Boolean(prof?.is_verified);

          const preview =
            c.lastMessage?.length > 80
              ? c.lastMessage.slice(0, 77) + "..."
              : c.lastMessage || "—";

          return {
            ...c,
            otherName,
            otherAvatar,
            otherUniversity,
            otherVerified,
            preview,
            timeLabel: formatTimeLabel(c.lastAt),
          };
        })
        .sort((a, b) => {
          const aTime = a.lastAt ? new Date(a.lastAt).getTime() : 0;
          const bTime = b.lastAt ? new Date(b.lastAt).getTime() : 0;
          return bTime - aTime;
        });

      setDialogs(enriched);
    } catch (e) {
      console.error("loadDialogs exception:", e);
      setDialogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDialogs();
  }, [loadDialogs]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`chat-list-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (!row) return;

          if (row.sender_id === userId || row.receiver_id === userId) {
            loadDialogs();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadDialogs]);

  const title = useMemo(() => {
    if (loading) return "Диалоги";
    return dialogs.length > 0 ? `Диалоги (${dialogs.length})` : "Диалоги";
  }, [loading, dialogs.length]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="space-y-2 mb-8">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">
            Messages
          </div>
          <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
            Диалоги
          </h1>
        </div>

        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-56 rounded bg-slate-100 dark:bg-slate-900" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">
            Messages
          </div>
          <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
            {title}
          </h1>
        </div>

        <Link
          href="/listings"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 text-white font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
        >
          <Search size={16} />
          Найти соседа
        </Link>
      </div>

      {dialogs.length === 0 ? (
        <div className="rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 w-16 h-16 rounded-[1.5rem] bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
            <MessageSquare className="text-indigo-500" size={28} />
          </div>

          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
            У тебя пока нет сообщений
          </h2>

          <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Открой профиль подходящего человека и начни диалог первым.
          </p>

          <Link
            href="/listings"
            className="inline-flex items-center gap-2 mt-6 px-6 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all"
          >
            <Search size={16} />
            Смотреть людей
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {dialogs.map((d) => (
            <Link
              key={d.conversation_id}
              href={`/chat/${d.other_user}`}
              className="block"
            >
              <div className="group rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-5 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {d.otherAvatar ? (
                      <img
                        src={d.otherAvatar}
                        alt={d.otherName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-sm font-black text-slate-500">
                        {d.otherName.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    {d.otherVerified && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow">
                        <ShieldCheck size={14} className="text-indigo-500" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-black text-slate-900 dark:text-white truncate">
                            {d.otherName}
                          </div>
                        </div>

                        {d.otherUniversity && (
                          <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-500">
                            <GraduationCap size={12} />
                            {d.otherUniversity}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 text-[11px] font-bold text-slate-400">
                        {d.timeLabel}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-3">
                      <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {d.preview || "—"}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {d.unread > 0 && (
                          <div className="min-w-[28px] h-7 px-2 rounded-full bg-red-500 text-white flex items-center justify-center text-[11px] font-black">
                            {d.unread > 99 ? "99+" : d.unread}
                          </div>
                        )}

                        <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
