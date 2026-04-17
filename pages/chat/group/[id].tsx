import { useEffect, useRef, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/hooks/utils/supabase/client";
import {
  ArrowLeft,
  Send,
  Users,
  MoreHorizontal,
  User,
  ShieldCheck,
  X,
  Crown,
  Shield,
  Trash2,
  UserPlus,
  CornerUpLeft,
  Paperclip,
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
  username?: string | null;
}

interface ReplyToData {
  id: string;
  content: string;
  sender_name: string;
}

interface GroupMessage {
  id: string;
  group_chat_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  metadata?: {
    reactions?: Record<string, string[]>;
    reply_to?: ReplyToData;
    [key: string]: any;
  } | null;
}

interface GroupChat {
  id: string;
  title: string | null;
  avatar_url?: string | null;
  description?: string | null;
  created_by?: string | null;
}

type MemberRole = "owner" | "admin" | "member";

interface MemberProfile {
  id: string;
  full_name: string | null;
  username?: string | null;
  avatar_url: string | null;
}

interface GroupMember {
  id: string;
  group_chat_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  added_by?: string | null;
  profiles: MemberProfile | null;
}

const roleLabelMap: Record<MemberRole, string> = {
  owner: "Владелец",
  admin: "Админ",
  member: "Участник",
};

const roleIconMap: Record<MemberRole, ReactNode> = {
  owner: <Crown size={14} className="text-amber-500" />,
  admin: <Shield size={14} className="text-indigo-500" />,
  member: <Users size={14} className="text-gray-400" />,
};

interface GroupChatInfoDrawerProps {
  open: boolean;
  onClose: () => void;
  groupTitle: string;
  members: GroupMember[];
  currentUserId: string;
  onRemoveMember: (userId: string) => void;
  onAddMember: () => void;
}

function GroupChatInfoDrawer({
  open,
  onClose,
  groupTitle,
  members,
  currentUserId,
  onRemoveMember,
  onAddMember,
}: GroupChatInfoDrawerProps) {
  if (!open) return null;

  const currentMember = members.find((m) => m.user_id === currentUserId);
  const currentRole = currentMember?.role;

  const canAdd = currentRole === "owner" || currentRole === "admin";

  const canRemoveMember = (target: GroupMember) => {
    if (!currentRole) return false;
    if (target.user_id === currentUserId) return false;

    if (currentRole === "owner") {
      return target.role === "admin" || target.role === "member";
    }

    if (currentRole === "admin") {
      return target.role === "member";
    }

    return false;
  };

  const sortedMembers = [...members].sort((a, b) => {
    const order: Record<MemberRole, number> = { owner: 0, admin: 1, member: 2 };
    return order[a.role] - order[b.role];
  });

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#0f172a]">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Информация о чате
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {groupTitle}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-gray-100 px-4 py-4 dark:border-gray-800">
          <h3 className="text-xl font-black text-gray-900 dark:text-white">
            {groupTitle}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {members.length} участников
          </p>

          {canAdd && (
            <button
              onClick={onAddMember}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
            >
              <UserPlus size={16} />
              Добавить участника
            </button>
          )}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {sortedMembers.map((member) => {
            const profile = member.profiles;
            const name =
              profile?.full_name || profile?.username || "Пользователь";

            return (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={name}
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <Link
                      href={`/profile/${member.user_id}`}
                      className="block truncate text-sm font-bold text-gray-900 hover:underline dark:text-white"
                    >
                      {name}
                    </Link>

                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      {roleIconMap[member.role]}
                      <span>{roleLabelMap[member.role]}</span>
                    </div>
                  </div>
                </div>

                {canRemoveMember(member) && (
                  <button
                    onClick={() => onRemoveMember(member.user_id)}
                    className="rounded-full p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    title="Удалить участника"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

const REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  if (diffDays < 7)
    return date.toLocaleDateString("ru-RU", { weekday: "long" });

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: now.getFullYear() !== date.getFullYear() ? "numeric" : undefined,
  });
}

function isSameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);

  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function TypingDots({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="mr-1 max-w-[150px] truncate text-[11px] text-indigo-400">
        {label}
      </span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1 w-1 animate-bounce rounded-full bg-indigo-400"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function GroupChatPage() {
  const router = useRouter();
  const rawId = router.query.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState("");
  const [group, setGroup] = useState<GroupChat | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [myRole, setMyRole] = useState<MemberRole | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyToData | null>(null);
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollDown = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, []);

  const mergeMessage = useCallback((incoming: GroupMessage) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === incoming.id);

      if (exists) {
        return prev
          .map((m) => (m.id === incoming.id ? incoming : m))
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );
      }

      return [...prev, incoming].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  const loadMissingProfiles = useCallback(
    async (senderIds: string[]) => {
      const uniqueIds = Array.from(new Set(senderIds.filter(Boolean)));
      if (!uniqueIds.length) return;

      const knownIds = new Set(profiles.map((p) => p.id));
      const missingIds = uniqueIds.filter((itemId) => !knownIds.has(itemId));
      if (!missingIds.length) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_verified, username")
        .in("id", missingIds);

      if (error) {
        console.error("Ошибка загрузки профилей:", error);
        return;
      }

      setProfiles((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        for (const p of data || []) {
          map.set(p.id, p as Profile);
        }
        return Array.from(map.values());
      });
    },
    [profiles]
  );

  const loadMembers = useCallback(async (groupId: string, currentUserId: string) => {
    const { data, error } = await supabase
      .from("group_chat_members")
      .select(`
        id,
        group_chat_id,
        user_id,
        role,
        joined_at,
        added_by,
        profiles!group_chat_members_user_id_fkey (
          id,
          full_name,
          username,
          avatar_url
        )
      `)
      .eq("group_chat_id", groupId);

    if (error) {
      console.error("Ошибка загрузки участников:", error);
      return;
    }

    const typedMembers = (data || []) as unknown as GroupMember[];
    setMembers(typedMembers);

    const me = typedMembers.find((m) => m.user_id === currentUserId);
    setMyRole(me?.role ?? null);
  }, []);

  const markGroupRead = useCallback(async (groupId: string, userId: string) => {
    const payload = {
      group_chat_id: groupId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("group_chat_reads")
      .upsert(payload, { onConflict: "group_chat_id,user_id" });

    if (error) {
      console.error("Ошибка обновления group_chat_reads:", error);
    }
  }, []);

  const getProfileById = useCallback(
    (userId: string) => profiles.find((p) => p.id === userId) ?? null,
    [profiles]
  );

  const sendTyping = useCallback(() => {
    if (!channelRef.current || !user?.id) return;

    if (typingThrottleRef.current) return;

    const myProfile = getProfileById(user.id);
    const name =
      myProfile?.full_name || myProfile?.username || user.email || "Кто-то";

    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        user_id: user.id,
        name,
      },
    });

    typingThrottleRef.current = setTimeout(() => {
      typingThrottleRef.current = null;
    }, 1200);
  }, [getProfileById, user]);

  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const target = messages.find((m) => m.id === messageId);
      if (!target || !user?.id) return;

      const currentReactions = target.metadata?.reactions || {};
      const currentUsers = currentReactions[emoji] || [];
      const alreadyReacted = currentUsers.includes(user.id);

      const nextReactions: Record<string, string[]> = { ...currentReactions };

      if (alreadyReacted) {
        const filtered = currentUsers.filter((uid) => uid !== user.id);
        if (filtered.length > 0) {
          nextReactions[emoji] = filtered;
        } else {
          delete nextReactions[emoji];
        }
      } else {
        nextReactions[emoji] = [...currentUsers, user.id];
      }

      const nextMetadata = {
        ...(target.metadata || {}),
        reactions: nextReactions,
      };

      const { error } = await supabase
        .from("group_chat_messages")
        .update({ metadata: nextMetadata })
        .eq("id", messageId);

      if (error) {
        console.error("Ошибка реакции:", error);
      } else {
        setReactionTarget(null);
      }
    },
    [messages, user?.id]
  );

  const handleLongPress = useCallback((messageId: string) => {
    if (longPressTimer) clearTimeout(longPressTimer);

    const timer = setTimeout(() => {
      setReactionTarget(messageId);
    }, 450);

    setLongPressTimer(timer);
  }, [longPressTimer]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !id || sending || !isMember) return;

    const text = input.trim();
    setSending(true);

    const { error } = await supabase.from("group_chat_messages").insert({
      group_chat_id: id,
      sender_id: user.id,
      content: text,
      metadata: replyTo ? { reply_to: replyTo } : null,
    });

    if (error) {
      console.error("Ошибка отправки:", error);
    } else {
      setInput("");
      setReplyTo(null);
    }

    setSending(false);
  };

  const removeMember = async (targetUserId: string) => {
    if (!id || !user?.id) return;

    const target = members.find((m) => m.user_id === targetUserId);
    if (!target) return;

    if (myRole === "member") return;
    if (myRole === "admin" && target.role !== "member") return;
    if (myRole === "owner" && target.user_id === user.id) return;

    const { error } = await supabase
      .from("group_chat_members")
      .delete()
      .eq("group_chat_id", id)
      .eq("user_id", targetUserId);

    if (error) {
      console.error("Ошибка удаления участника:", error);
      return;
    }

    await loadMembers(id, user.id);
  };

  const addMember = async () => {
    if (!id || !user?.id) return;
    if (myRole !== "owner" && myRole !== "admin") return;

    const userIdToAdd = window.prompt("Вставь id пользователя:");
    if (!userIdToAdd) return;

    const { error } = await supabase.from("group_chat_members").insert({
      group_chat_id: id,
      user_id: userIdToAdd,
      role: "member",
      added_by: user.id,
    });

    if (error) {
      console.error("Ошибка добавления участника:", error);
      alert("Не удалось добавить участника");
      return;
    }

    await loadMembers(id, user.id);
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;

      const currentUser = data.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        router.push("/login");
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  useEffect(() => {
    if (!id || !user?.id) return;

    let active = true;

    const init = async () => {
      setLoading(true);

      try {
        const [
          { data: membership, error: membershipError },
          { data: groupData, error: groupError },
        ] = await Promise.all([
          supabase
            .from("group_chat_members")
            .select("group_chat_id")
            .eq("group_chat_id", id)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("group_chats")
            .select("id, title, avatar_url, description, created_by")
            .eq("id", id)
            .maybeSingle(),
        ]);

        if (membershipError) {
          console.error("Ошибка проверки membership:", membershipError);
        }

        if (groupError) {
          console.error("Ошибка загрузки группы:", groupError);
        }

        if (!active) return;

        const member = Boolean(membership);
        setIsMember(member);
        setGroup((groupData as GroupChat) ?? null);

        if (!member) {
          setLoading(false);
          return;
        }

        await loadMembers(id, user.id);

        const { data: msgData, error: msgError } = await supabase
          .from("group_chat_messages")
          .select("id, group_chat_id, sender_id, content, created_at, metadata")
          .eq("group_chat_id", id)
          .order("created_at", { ascending: true });

        if (msgError) {
          console.error("Ошибка загрузки сообщений:", msgError);
        }

        const msgs = (msgData as GroupMessage[]) || [];

        if (!active) return;

        setMessages(msgs);

        const senderIds = msgs.map((m) => m.sender_id);
        await loadMissingProfiles(senderIds);
        await markGroupRead(id, user.id);

        setTimeout(() => scrollDown("auto"), 80);
      } finally {
        if (active) setLoading(false);
      }
    };

    init();

    return () => {
      active = false;
    };
  }, [
    id,
    user?.id,
    loadMembers,
    loadMissingProfiles,
    markGroupRead,
    scrollDown,
  ]);

  useEffect(() => {
    if (!id || !user?.id || !isMember) return;

    const channel = supabase.channel(`group:${id}`);
    channelRef.current = channel;

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_chat_messages",
          filter: `group_chat_id=eq.${id}`,
        },
        async (payload) => {
          const newMessage = payload.new as GroupMessage;
          mergeMessage(newMessage);
          await loadMissingProfiles([newMessage.sender_id]);
          await markGroupRead(id, user.id);
          setTimeout(() => scrollDown(), 50);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "group_chat_messages",
          filter: `group_chat_id=eq.${id}`,
        },
        async (payload) => {
          const updated = payload.new as GroupMessage;
          mergeMessage(updated);
          await loadMissingProfiles([updated.sender_id]);
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        const { user_id, name } = payload.payload || {};
        if (!user_id || user_id === user.id) return;

        setTypingUsers((prev) => ({ ...prev, [user_id]: name || "Кто-то" }));

        if (typingTimersRef.current[user_id]) {
          clearTimeout(typingTimersRef.current[user_id]);
        }

        typingTimersRef.current[user_id] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[user_id];
            return next;
          });
        }, 2200);
      })
      .subscribe();

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);

      Object.values(typingTimersRef.current).forEach((timer) =>
        clearTimeout(timer)
      );

      typingTimersRef.current = {};

      if (typingThrottleRef.current) {
        clearTimeout(typingThrottleRef.current);
        typingThrottleRef.current = null;
      }
    };
  }, [
    id,
    user?.id,
    isMember,
    loadMissingProfiles,
    markGroupRead,
    mergeMessage,
    scrollDown,
  ]);

  useEffect(() => {
    if (!reactionTarget) return;

    const handler = () => setReactionTarget(null);
    document.addEventListener("click", handler);

    return () => document.removeEventListener("click", handler);
  }, [reactionTarget]);

  const typingNames = Object.values(typingUsers);

  const typingLabel = () => {
    if (typingNames.length === 0) return null;
    if (typingNames.length === 1) return `${typingNames[0]} печатает`;
    if (typingNames.length === 2) {
      return `${typingNames[0]} и ${typingNames[1]} печатают`;
    }
    return "Несколько человек печатают";
  };

  if (!user && !loading) return null;

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-gray-50 dark:bg-[#0a0a0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!group || isMember === false) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-gray-50 px-6 dark:bg-[#0a0a0f]">
        <div className="w-full max-w-md rounded-[2rem] border border-gray-100 bg-white p-8 text-center shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/10">
            <Users size={24} className="text-indigo-500" />
          </div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">
            Группа недоступна
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Возможно, тебя нет в этой группе или она была удалена.
          </p>
          <button
            onClick={() => router.push("/chat")}
            className="mt-6 rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white transition-all hover:bg-indigo-700"
          >
            Назад к чатам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-gray-50 font-sans dark:bg-[#0a0a0f]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => router.back()}
            className="-ml-2 rounded-full p-2 text-gray-500 transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={20} />
          </button>

          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            className="m-0 flex min-w-0 items-center gap-3 rounded-none border-none bg-transparent p-0 text-left"
          >
            <div className="relative shrink-0">
              <div className="h-10 w-10 overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                {group?.avatar_url ? (
                  <Image
                    src={group.avatar_url}
                    alt="group avatar"
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    <Users size={20} />
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-[14px] font-bold text-gray-900 dark:text-white">
                {group?.title || "Группа"}
              </h1>
              <p className="truncate text-[11px] font-medium text-indigo-500 dark:text-indigo-400">
                {members.length > 0
                  ? `${members.length} участников`
                  : "Групповой чат"}
              </p>
            </div>
          </button>
        </div>

        <button
          onClick={() => setIsInfoOpen(true)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <MoreHorizontal size={20} />
        </button>
      </header>

      <main className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-4 py-3 scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-xs text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800">
                <Send size={22} className="text-indigo-400" />
              </div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Нет сообщений
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Напиши первым, чтобы начать.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const showDateSep =
              !prevMsg || !isSameDay(prevMsg.created_at, msg.created_at);
            const isMe = msg.sender_id === user?.id;
            const sender = getProfileById(msg.sender_id);
            const reactions = msg.metadata?.reactions || {};
            const hasReactions = Object.keys(reactions).length > 0;
            const replyData = msg.metadata?.reply_to;

            const nextMsg = messages[idx + 1];
            const isLastInGroup =
              !nextMsg ||
              nextMsg.sender_id !== msg.sender_id ||
              !isSameDay(msg.created_at, nextMsg.created_at);

            return (
              <div key={msg.id}>
                {showDateSep && (
                  <div className="my-4 flex justify-center">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium text-gray-400 dark:bg-gray-800">
                      {formatDateSeparator(msg.created_at)}
                    </span>
                  </div>
                )}

                <div
                  className={`group relative mb-0.5 flex ${
                    isMe ? "justify-end" : "justify-start"
                  }`}
                  onMouseDown={() => handleLongPress(msg.id)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={() => handleLongPress(msg.id)}
                  onTouchEnd={cancelLongPress}
                >
                  {reactionTarget === msg.id && (
                    <div
                      className={`absolute -top-12 z-30 flex items-center gap-1 rounded-2xl border border-gray-100 bg-white px-2 py-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800 ${
                        isMe ? "right-0" : "left-0"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => addReaction(msg.id, emoji)}
                          className="text-xl transition-transform hover:scale-125"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() =>
                      setReplyTo({
                        id: msg.id,
                        content: msg.content || "",
                        sender_name:
                          isMe
                            ? "Вы"
                            : sender?.full_name ||
                              sender?.username ||
                              "Пользователь",
                      })
                    }
                    className={`mb-1 shrink-0 self-end rounded-full p-1.5 text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-indigo-500 group-hover:opacity-100 dark:hover:bg-gray-800 ${
                      isMe ? "order-first mr-1" : "order-last ml-1"
                    }`}
                  >
                    <CornerUpLeft size={13} />
                  </button>

                  {!isMe && (
                    <div className="mr-1.5 w-7 shrink-0 self-end">
                      {isLastInGroup && (
                        <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                          {sender?.avatar_url ? (
                            <Image
                              src={sender.avatar_url}
                              alt=""
                              width={28}
                              height={28}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User size={13} className="text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`relative max-w-[78%] px-3.5 py-2.5 shadow-sm md:max-w-[62%] ${
                      isMe
                        ? "rounded-[1.1rem] rounded-tr-sm bg-indigo-600 text-white"
                        : "rounded-[1.1rem] rounded-tl-sm border border-gray-100 bg-white text-gray-900 dark:border-gray-700/50 dark:bg-gray-800 dark:text-gray-100"
                    }`}
                  >
                    {!isMe &&
                      (!prevMsg || prevMsg.sender_id !== msg.sender_id) && (
                        <div className="mb-1 flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-300">
                            {sender?.full_name ||
                              sender?.username ||
                              "Пользователь"}
                          </span>
                          {sender?.is_verified && (
                            <ShieldCheck
                              size={11}
                              className="text-indigo-500"
                            />
                          )}
                        </div>
                      )}

                    {replyData && (
                      <div
                        className={`mb-2 rounded-sm border-l-2 pl-2 ${
                          isMe ? "border-white/50" : "border-indigo-400"
                        }`}
                      >
                        <p
                          className={`text-[10px] font-semibold ${
                            isMe ? "text-white/70" : "text-indigo-500"
                          }`}
                        >
                          {replyData.sender_name}
                        </p>
                        <p
                          className={`truncate text-[11px] ${
                            isMe ? "text-white/60" : "text-gray-400"
                          }`}
                        >
                          {replyData.content}
                        </p>
                      </div>
                    )}

                    <p className="select-text whitespace-pre-wrap break-words text-[14px] leading-relaxed">
                      {msg.content}
                    </p>

                    <div
                      className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] font-medium opacity-60 ${
                        isMe ? "text-white" : "text-gray-400"
                      }`}
                    >
                      {msg.created_at
                        ? new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </div>

                    {hasReactions && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {Object.entries(reactions).map(([emoji, userIds]) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(msg.id, emoji)}
                            className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] transition-all ${
                              (userIds as string[]).includes(user?.id || "")
                                ? "border-indigo-300 bg-indigo-100 dark:border-indigo-600 dark:bg-indigo-900/40"
                                : "border-gray-200 bg-gray-100 dark:border-gray-600 dark:bg-gray-700"
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-gray-600 dark:text-gray-300">
                              {(userIds as string[]).length}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={bottomRef} className="h-2" />
      </main>

      {replyTo && (
        <div className="flex items-center gap-3 border-t border-gray-100 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
          <div className="min-w-0 flex-1 border-l-2 border-indigo-500 pl-3">
            <p className="text-[11px] font-semibold text-indigo-500">
              {replyTo.sender_name}
            </p>
            <p className="truncate text-[12px] text-gray-400">
              {replyTo.content}
            </p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="shrink-0 p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <footer className="border-t border-gray-100 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900">
        {typingLabel() && (
          <div className="mb-2 px-1">
            <TypingDots label={typingLabel() as string} />
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => console.log("File selected:", e.target.files?.[0])}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-xl p-2.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-indigo-500 dark:hover:bg-gray-800"
          >
            <Paperclip size={18} />
          </button>

          <div className="flex flex-1 items-end rounded-2xl bg-gray-100 px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-indigo-500/30 dark:bg-gray-800">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                sendTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Сообщение..."
              className="max-h-32 flex-1 resize-none border-none bg-transparent text-[14px] text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className={`shrink-0 rounded-xl p-2.5 transition-all active:scale-95 ${
              input.trim() && !sending
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                : "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700"
            }`}
          >
            <Send size={17} strokeWidth={2.5} />
          </button>
        </div>
      </footer>

      <GroupChatInfoDrawer
        open={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        groupTitle={group?.title || "Группа"}
        members={members}
        currentUserId={user.id}
        onRemoveMember={removeMember}
        onAddMember={addMember}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.08);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}