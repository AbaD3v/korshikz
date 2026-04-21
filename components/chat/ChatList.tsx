"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/hooks/utils/supabase/client";
import {
  MessageSquare,
  ShieldCheck,
  GraduationCap,
  Search,
  Users,
  Check,
  CheckCheck,
  X,
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

type GroupItem = {
  id: string;
  title: string | null;
  avatar_url: string | null;
  lastMessage: string;
  lastAt: string | null;
  unread: number;
  timeLabel: string;
  memberCount?: number;
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
  isOutgoing: boolean;
  isRead: boolean;
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
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate()
  ) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Вчера";
  if (diffDays < 7)
    return date.toLocaleDateString("ru-RU", { weekday: "short" });
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

// Online presence: track users online via Supabase presence
function useOnlineUsers(userIds: string[], myId: string | null) {
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!myId || userIds.length === 0) return;

    const channel = supabase.channel("online-users", {
      config: { presence: { key: myId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        const ids = new Set(
          Object.values(state)
            .flat()
            .map((p: any) => p.user_id)
        );
        setOnlineSet(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: myId });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId, userIds.join(",")]);

  return onlineSet;
}

export default function ChatList() {
  const [dialogs, setDialogs] = useState<DialogItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<"direct" | "groups">("direct");
  const [search, setSearch] = useState("");

  const allUserIds = useMemo(
    () => dialogs.map((d) => d.other_user),
    [dialogs]
  );
  const onlineUsers = useOnlineUsers(allUserIds, userId);

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

      // Load direct messages
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

      const convMap = new Map<
        string,
        {
          conversation_id: string;
          other_user: string;
          lastMessage: string;
          lastAt: string | null;
          unread: number;
          isOutgoing: boolean;
          isRead: boolean;
        }
      >();

      for (const msg of (messages || []) as RawMessage[]) {
        const convId = msg.conversation_id;
        if (!convId) continue;
        const otherUser =
          msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!otherUser || otherUser === user.id) continue;

        if (!convMap.has(convId)) {
          const isOutgoing = msg.sender_id === user.id;
          let isRead = Boolean(msg.is_read);
          try {
            const readBy = msg?.metadata?.read_by;
            if (Array.isArray(readBy)) isRead = readBy.includes(msg.receiver_id);
          } catch {}

          convMap.set(convId, {
            conversation_id: convId,
            other_user: otherUser,
            lastMessage: msg.body ?? "",
            lastAt: msg.created_at ?? null,
            unread: 0,
            isOutgoing,
            isRead,
          });
        }

        const isIncoming = msg.receiver_id === user.id;
        let alreadyRead = Boolean(msg.is_read);
        try {
          const readBy = msg?.metadata?.read_by;
          if (Array.isArray(readBy)) alreadyRead = readBy.includes(user.id);
        } catch {}

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
        const { data: profilesData } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, is_verified, university:universities(id, name)"
          )
          .in("id", otherUserIds);

        profiles = ((profilesData || []) as any[]).map((profile) => ({
          ...profile,
          university: pickRelation(profile.university),
        })) as ProfileMini[];
      }

      const profilesMap = new Map(profiles.map((p) => [p.id, p]));

      const enriched: DialogItem[] = convArray
        .map((c) => {
          const prof = profilesMap.get(c.other_user) || null;
          const otherName =
            prof?.full_name || `Пользователь ${c.other_user.slice(0, 6)}`;
          const preview =
            c.lastMessage?.length > 60
              ? c.lastMessage.slice(0, 57) + "..."
              : c.lastMessage || "—";

          return {
            ...c,
            otherName,
            otherAvatar: prof?.avatar_url || null,
            otherUniversity: prof?.university?.name || null,
            otherVerified: Boolean(prof?.is_verified),
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

      // Load groups
      const { data: memberRows } = await supabase
        .from("group_chat_members")
        .select("group_chat_id")
        .eq("user_id", user.id);

      const groupIds = (memberRows || []).map((r: any) => r.group_chat_id);

      if (groupIds.length > 0) {
        const { data: groupsData } = await supabase
          .from("group_chats")
          .select("id, title, avatar_url")
          .in("id", groupIds);

        // Get last message and unread count per group
        const groupItems: GroupItem[] = await Promise.all(
          (groupsData || []).map(async (g: any) => {
            const { data: lastMsgs } = await supabase
              .from("group_chat_messages")
              .select("content, created_at")
              .eq("group_chat_id", g.id)
              .order("created_at", { ascending: false })
              .limit(1);

            const { data: reads } = await supabase
              .from("group_chat_reads")
              .select("last_read_at")
              .eq("group_chat_id", g.id)
              .eq("user_id", user.id)
              .maybeSingle();

            const lastReadAt = reads?.last_read_at || null;
            let unread = 0;
            if (lastReadAt) {
              const { count } = await supabase
                .from("group_chat_messages")
                .select("*", { count: "exact", head: true })
                .eq("group_chat_id", g.id)
                .gt("created_at", lastReadAt)
                .neq("sender_id", user.id);
              unread = count || 0;
            }

            const { count: memberCount } = await supabase
              .from("group_chat_members")
              .select("*", { count: "exact", head: true })
              .eq("group_chat_id", g.id);

            const lastMsg = lastMsgs?.[0];
            return {
              id: g.id,
              title: g.title,
              avatar_url: g.avatar_url,
              lastMessage: lastMsg?.content || "",
              lastAt: lastMsg?.created_at || null,
              unread,
              timeLabel: formatTimeLabel(lastMsg?.created_at || null),
              memberCount: memberCount || 0,
            };
          })
        );

        setGroups(
          groupItems.sort((a, b) => {
            const aTime = a.lastAt ? new Date(a.lastAt).getTime() : 0;
            const bTime = b.lastAt ? new Date(b.lastAt).getTime() : 0;
            return bTime - aTime;
          })
        );
      }
    } catch (e) {
      console.error("loadDialogs exception:", e);
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_chat_messages" },
        () => loadDialogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadDialogs]);

  const filteredDialogs = useMemo(() => {
    if (!search.trim()) return dialogs;
    const q = search.toLowerCase();
    return dialogs.filter(
      (d) =>
        d.otherName.toLowerCase().includes(q) ||
        d.preview.toLowerCase().includes(q)
    );
  }, [dialogs, search]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(
      (g) =>
        (g.title || "").toLowerCase().includes(q) ||
        g.lastMessage.toLowerCase().includes(q)
    );
  }, [groups, search]);

  const totalUnread =
    tab === "direct"
      ? dialogs.reduce((s, d) => s + d.unread, 0)
      : groups.reduce((s, g) => s + g.unread, 0);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <ChatHeader />
        <SearchBar value="" onChange={() => {}} />
        <TabBar tab="direct" setTab={() => {}} directUnread={0} groupUnread={0} />
        <div className="space-y-2 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <ChatHeader />
      <SearchBar value={search} onChange={setSearch} />
      <TabBar
        tab={tab}
        setTab={setTab}
        directUnread={dialogs.reduce((s, d) => s + d.unread, 0)}
        groupUnread={groups.reduce((s, g) => s + g.unread, 0)}
      />

      {tab === "direct" ? (
        filteredDialogs.length === 0 ? (
          <EmptyState type="direct" hasSearch={!!search} />
        ) : (
          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredDialogs.map((d) => (
              <DirectRow
                key={d.conversation_id}
                d={d}
                isOnline={onlineUsers.has(d.other_user)}
              />
            ))}
          </div>
        )
      ) : filteredGroups.length === 0 ? (
        <EmptyState type="groups" hasSearch={!!search} />
      ) : (
        <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredGroups.map((g) => (
            <GroupRow key={g.id} g={g} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ChatHeader() {
  return (
    <div className="flex items-center justify-between mb-5">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
        Сообщения
      </h1>
      <Link
        href="/listings"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs tracking-wide hover:bg-indigo-700 active:scale-95 transition-all"
      >
        <Search size={13} />
        Найти соседа
      </Link>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative mb-4">
      <Search
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Поиск..."
        className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 border-none outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function TabBar({
  tab,
  setTab,
  directUnread,
  groupUnread,
}: {
  tab: "direct" | "groups";
  setTab: (t: "direct" | "groups") => void;
  directUnread: number;
  groupUnread: number;
}) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-1">
      {(
        [
          { key: "direct", label: "Личные", icon: MessageSquare, count: directUnread },
          { key: "groups", label: "Группы", icon: Users, count: groupUnread },
        ] as const
      ).map(({ key, label, icon: Icon, count }) => (
        <button
          key={key}
          onClick={() => setTab(key)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === key
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
          }`}
        >
          <Icon size={14} />
          {label}
          {count > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function DirectRow({ d, isOnline }: { d: DialogItem; isOnline: boolean }) {
  return (
    <Link href={`/chat/${d.other_user}`} className="block">
      <div className="flex items-center gap-3 py-3.5 px-1 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center">
            {d.otherAvatar ? (
              <img
                src={d.otherAvatar}
                alt={d.otherName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-black text-slate-500 dark:text-slate-400">
                {d.otherName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white dark:border-slate-900" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-[14px] text-slate-900 dark:text-white truncate">
                {d.otherName}
              </span>
              {d.otherVerified && (
                <ShieldCheck size={13} className="text-indigo-500 shrink-0" />
              )}
            </div>
            <span className="text-[11px] text-slate-400 shrink-0 ml-2">
              {d.timeLabel}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0">
              {d.isOutgoing && (
                <span className="shrink-0">
                  {d.isRead ? (
                    <CheckCheck size={13} className="text-indigo-500" />
                  ) : (
                    <Check size={13} className="text-slate-400" />
                  )}
                </span>
              )}
              <span className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
                {d.isOutgoing ? (
                  <span className="text-slate-400 dark:text-slate-500">Вы: </span>
                ) : null}
                {d.preview || "—"}
              </span>
            </div>

            {d.unread > 0 && (
              <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                {d.unread > 99 ? "99+" : d.unread}
              </span>
            )}
          </div>

          {d.otherUniversity && (
            <div className="flex items-center gap-1 mt-0.5">
              <GraduationCap size={10} className="text-indigo-400" />
              <span className="text-[11px] text-indigo-400 truncate">
                {d.otherUniversity}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function GroupRow({ g }: { g: GroupItem }) {
  return (
    <Link href={`/chat/group/${g.id}`} className="block">
      <div className="flex items-center gap-3 py-3.5 px-1 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors cursor-pointer">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 overflow-hidden flex items-center justify-center shrink-0">
          {g.avatar_url ? (
            <img
              src={g.avatar_url}
              alt={g.title || "group"}
              className="w-full h-full object-cover"
            />
          ) : (
            <Users size={20} className="text-indigo-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-bold text-[14px] text-slate-900 dark:text-white truncate">
              {g.title || "Группа"}
            </span>
            <span className="text-[11px] text-slate-400 shrink-0 ml-2">
              {g.timeLabel}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
              {g.lastMessage
                ? g.lastMessage.length > 55
                  ? g.lastMessage.slice(0, 52) + "..."
                  : g.lastMessage
                : "Нет сообщений"}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {g.memberCount !== undefined && (
                <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                  <Users size={10} />
                  {g.memberCount}
                </span>
              )}
              {g.unread > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                  {g.unread > 99 ? "99+" : g.unread}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({
  type,
  hasSearch,
}: {
  type: "direct" | "groups";
  hasSearch: boolean;
}) {
  return (
    <div className="mt-16 text-center">
      <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
        {type === "direct" ? (
          <MessageSquare className="text-indigo-400" size={24} />
        ) : (
          <Users className="text-indigo-400" size={24} />
        )}
      </div>
      {hasSearch ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Ничего не найдено
        </p>
      ) : (
        <>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            {type === "direct" ? "Нет диалогов" : "Нет групп"}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {type === "direct"
              ? "Открой профиль и начни диалог первым"
              : "Создай группу или дождись приглашения"}
          </p>
          {type === "direct" && (
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs tracking-wide hover:bg-indigo-700 transition-all"
            >
              <Search size={13} />
              Найти соседа
            </Link>
          )}
        </>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3.5 px-1 animate-pulse">
      <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-3 w-10 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="h-3 w-48 rounded bg-slate-100 dark:bg-slate-800/60" />
      </div>
    </div>
  );
}
