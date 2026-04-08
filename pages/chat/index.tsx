import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { supabase } from "@/hooks/utils/supabase/client";
import {
  ChevronRight,
  MessageSquare,
  Search,
  User,
  Users,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  university?: { id: string; name: string } | null;
  is_verified?: boolean | null;
}

interface DirectDialogItem {
  id: string;
  kind: "direct";
  href: string;
  title: string;
  avatar_url: string | null;
  lastMessage: string | null;
  lastTime: string | null;
  unread: number;
  university?: string | null;
  is_verified?: boolean;
}

const pickRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

interface GroupDialogItem {
  id: string;
  kind: "group";
  href: string;
  title: string;
  avatar_url: string | null;
  lastMessage: string | null;
  lastTime: string | null;
  unread: number;
  lastAuthorName: string | null;
}

type ChatListItem = DirectDialogItem | GroupDialogItem;

export default function ChatList() {
  const [user, setUser] = useState<any>(null);
  const [dialogs, setDialogs] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;

      const u = data.user ?? null;
      setUser(u);

      if (!u) {
        router.push("/login");
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  const loadDirectDialogs = useCallback(
    async (currentUserId: string): Promise<DirectDialogItem[]> => {
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("sender_id, receiver_id, body, created_at, is_read")
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false });

      if (messagesError) {
        console.error("Direct messages load error:", messagesError);
        return [];
      }

      if (!messages || messages.length === 0) return [];

      const dialogMap = new Map<
        string,
        {
          otherUserId: string;
          lastMessage: string | null;
          lastTime: string | null;
          fromMe: boolean;
        }
      >();

      for (const msg of messages) {
        const otherId =
          msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;

        if (!otherId) continue;

        if (!dialogMap.has(otherId)) {
          dialogMap.set(otherId, {
            otherUserId: otherId,
            lastMessage: msg.body ?? null,
            lastTime: msg.created_at ?? null,
            fromMe: msg.sender_id === currentUserId,
          });
        }
      }

      const ids = Array.from(dialogMap.keys());

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_verified, university:universities(id, name)")
        .in("id", ids);

      if (profilesError) {
        console.error("Profiles load error:", profilesError);
      }

      const { data: unreadMessages, error: unreadError } = await supabase
        .from("messages")
        .select("sender_id, receiver_id, is_read")
        .eq("receiver_id", currentUserId)
        .eq("is_read", false);

      if (unreadError) {
        console.error("Unread direct messages load error:", unreadError);
      }

      return ids.map((uid) => {
        const prof = profiles?.find((p) => p.id === uid);
        const university = pickRelation(prof?.university);
        const dialog = dialogMap.get(uid);
        const unreadCount =
          unreadMessages?.filter((m) => m.sender_id === uid).length ?? 0;

        const rawLastMessage = dialog?.lastMessage ?? null;
        const prefixedLastMessage =
          rawLastMessage && dialog?.fromMe ? `Вы: ${rawLastMessage}` : rawLastMessage;

        return {
          id: `direct-${uid}`,
          kind: "direct" as const,
          href: `/chat/${uid}`,
          title: prof?.full_name ?? "Пользователь",
          avatar_url: prof?.avatar_url ?? null,
          lastMessage: prefixedLastMessage,
          lastTime: dialog?.lastTime ?? null,
          unread: unreadCount,
          university: university?.name ?? null,
          is_verified: Boolean(prof?.is_verified),
        };
      });
    },
    []
  );

  const loadGroupDialogs = useCallback(
    async (currentUserId: string): Promise<GroupDialogItem[]> => {
      const { data: memberships, error: membershipsError } = await supabase
        .from("group_chat_members")
        .select("group_chat_id")
        .eq("user_id", currentUserId);

      if (membershipsError) {
        console.error("Group memberships load error:", membershipsError);
        return [];
      }

      const groupIds =
        memberships?.map((m: { group_chat_id: string }) => m.group_chat_id) ?? [];

      if (groupIds.length === 0) return [];

      const { data: groups, error: groupsError } = await supabase
        .from("group_chats")
        .select("id, title, avatar_url")
        .in("id", groupIds);

      if (groupsError) {
        console.error("Groups load error:", groupsError);
        return [];
      }

      const { data: groupMessages, error: groupMessagesError } = await supabase
        .from("group_chat_messages")
        .select("id, group_chat_id, sender_id, content, created_at")
        .in("group_chat_id", groupIds)
        .order("created_at", { ascending: false });

      if (groupMessagesError) {
        console.error("Group messages load error:", groupMessagesError);
        return [];
      }

      const latestByGroup = new Map<
        string,
        {
          id: string;
          group_chat_id: string;
          sender_id: string;
          content: string | null;
          created_at: string | null;
        }
      >();

      for (const msg of groupMessages ?? []) {
        if (!latestByGroup.has(msg.group_chat_id)) {
          latestByGroup.set(msg.group_chat_id, msg);
        }
      }

      const senderIds = Array.from(
        new Set((groupMessages ?? []).map((m) => m.sender_id).filter(Boolean))
      );

      let senderProfiles: Profile[] = [];
      if (senderIds.length > 0) {
        const { data: profiles, error: senderProfilesError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", senderIds);

        if (senderProfilesError) {
          console.error("Group sender profiles load error:", senderProfilesError);
        } else {
          senderProfiles = profiles ?? [];
        }
      }

      const { data: unreadRows, error: unreadError } = await supabase
        .from("group_chat_reads")
        .select("group_chat_id, last_read_at")
        .eq("user_id", currentUserId);

      if (unreadError) {
        console.error("Group reads load error:", unreadError);
      }

      const readMap = new Map<string, string | null>();
      for (const row of unreadRows ?? []) {
        readMap.set(row.group_chat_id, row.last_read_at ?? null);
      }

      const unreadCountMap = new Map<string, number>();
      for (const groupId of groupIds) {
        unreadCountMap.set(groupId, 0);
      }

      for (const msg of groupMessages ?? []) {
        if (msg.sender_id === currentUserId) continue;

        const lastReadAt = readMap.get(msg.group_chat_id);
        const isUnread =
          !lastReadAt ||
          new Date(msg.created_at).getTime() > new Date(lastReadAt).getTime();

        if (isUnread) {
          unreadCountMap.set(
            msg.group_chat_id,
            (unreadCountMap.get(msg.group_chat_id) ?? 0) + 1
          );
        }
      }

      return (groups ?? []).map((group) => {
        const latest = latestByGroup.get(group.id);
        const author = senderProfiles.find((p) => p.id === latest?.sender_id);

        return {
          id: `group-${group.id}`,
          kind: "group" as const,
          href: `/chat/group/${group.id}`,
          title: group.title ?? "Группа",
          avatar_url: group.avatar_url ?? null,
          lastMessage: latest?.content ?? null,
          lastTime: latest?.created_at ?? null,
          unread: unreadCountMap.get(group.id) ?? 0,
          lastAuthorName: author?.full_name ?? null,
        };
      });
    },
    []
  );

  const loadDialogsSafe = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      const [directDialogs, groupDialogs] = await Promise.all([
        loadDirectDialogs(user.id),
        loadGroupDialogs(user.id),
      ]);

      const merged = [...directDialogs, ...groupDialogs].sort((a, b) => {
        const aTime = a.lastTime ? new Date(a.lastTime).getTime() : 0;
        const bTime = b.lastTime ? new Date(b.lastTime).getTime() : 0;
        return bTime - aTime;
      });

      setDialogs(merged);
    } catch (error) {
      console.error("Error loading chat list:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadDirectDialogs, loadGroupDialogs]);

  useEffect(() => {
    if (!user?.id) return;
    loadDialogsSafe();
  }, [user?.id, loadDialogsSafe]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`chat-list-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          loadDialogsSafe();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_chat_messages" },
        () => {
          loadDialogsSafe();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_chat_reads" },
        () => {
          loadDialogsSafe();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_chat_members" },
        () => {
          loadDialogsSafe();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadDialogsSafe]);

  const filteredDialogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dialogs;

    return dialogs.filter((d) => {
      const inTitle = d.title.toLowerCase().includes(q);
      const inMessage = (d.lastMessage ?? "").toLowerCase().includes(q);
      const inAuthor =
        d.kind === "group"
          ? (d.lastAuthorName ?? "").toLowerCase().includes(q)
          : false;
      const inUniversity =
        d.kind === "direct"
          ? (d.university ?? "").toLowerCase().includes(q)
          : false;

      return inTitle || inMessage || inAuthor || inUniversity;
    });
  }, [dialogs, searchQuery]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    return isToday
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString([], { day: "numeric", month: "short" });
  };

  const renderSubtitle = (item: ChatListItem) => {
    if (item.kind === "group") {
      if (!item.lastMessage) return "Нет сообщений";
      return item.lastAuthorName
        ? `${item.lastAuthorName}: ${item.lastMessage}`
        : item.lastMessage;
    }

    return item.lastMessage ?? "Нет сообщений";
  };

  if (!user && !loading) return null;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 min-h-screen bg-gray-50 dark:bg-[#020617] transition-colors duration-500">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Сообщения
          </h2>
          <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 rounded-full">
            <MessageSquare
              className="text-indigo-600 dark:text-indigo-400"
              size={20}
            />
          </div>
        </div>

        <Link
          href="/chat/create-group"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all whitespace-nowrap"
        >
          <Users size={16} />
          Создать группу
        </Link>
      </div>

      <div className="relative mb-6">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Поиск чатов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white transition-all shadow-sm"
        />
      </div>

      <div className="space-y-2">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 bg-white/50 dark:bg-gray-900/50 rounded-2xl animate-pulse"
            >
              <div className="w-14 h-14 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : filteredDialogs.length > 0 ? (
          filteredDialogs.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 rounded-[1.5rem] transition-all duration-300 group active:scale-[0.98] shadow-sm"
            >
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-50 dark:border-gray-700 relative">
                  {item.avatar_url ? (
                    <Image
                      src={item.avatar_url}
                      alt="avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      {item.kind === "group" ? <Users size={24} /> : <User size={24} />}
                    </div>
                  )}
                </div>

                {item.unread > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
                    {item.unread > 99 ? "99+" : item.unread}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {item.title}
                    </p>

                    {item.kind === "direct" && item.is_verified && (
                      <ShieldCheck
                        size={14}
                        className="text-indigo-500 shrink-0"
                      />
                    )}

                    {item.kind === "group" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-semibold shrink-0">
                        Группа
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase shrink-0">
                    {item.lastTime ? formatTime(item.lastTime) : ""}
                  </span>
                </div>

                {item.kind === "direct" && item.university ? (
                  <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-500">
                    <GraduationCap size={12} />
                    {item.university}
                  </div>
                ) : null}

                <p
                  className={`text-sm truncate ${
                    item.unread > 0
                      ? "text-gray-900 dark:text-gray-200 font-semibold"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {renderSubtitle(item)}
                </p>
              </div>

              <ChevronRight
                size={18}
                className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all shrink-0"
              />
            </Link>
          ))
        ) : (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-800">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={32} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Чатов не найдено
            </h3>
            <p className="text-gray-500 text-sm mt-1 max-w-[240px] mx-auto">
              Начните личную переписку или создайте групповой чат
            </p>
            <Link
              href="/listings"
              className="mt-6 inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold hover:bg-indigo-700 transition-all"
            >
              Найти соседа
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
