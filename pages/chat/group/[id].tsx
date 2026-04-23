import { useEffect, useRef, useState, useCallback } from "react";
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
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
  username?: string | null;
}

interface GroupMessage {
  id: string;
  group_chat_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
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

const roleIconMap: Record<MemberRole, React.ReactNode> = {
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
    const order = { owner: 0, admin: 1, member: 2 };
    return order[a.role] - order[b.role];
  });

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-[#0f172a] border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
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
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
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

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {sortedMembers.map((member) => {
            const profile = member.profiles;
            const name =
              profile?.full_name || profile?.username || "Пользователь";

            return (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/5 p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={name}
                        width={44}
                        height={44}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <Link
                      href={`/profile/${member.user_id}`}
                      className="block text-sm font-bold text-gray-900 dark:text-white truncate hover:underline"
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
                    className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
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
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        return prev.map((m) => (m.id === incoming.id ? incoming : m));
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
      const missingIds = uniqueIds.filter((id) => !knownIds.has(id));
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
          .select("id, group_chat_id, sender_id, content, created_at")
          .eq("group_chat_id", id)
          .order("created_at", { ascending: true });

        if (msgError) {
          console.error("Ошибка загрузки сообщений:", msgError);
          if (active) setLoading(false);
          return;
        }

        const msgs = (msgData as GroupMessage[]) || [];
        if (!active) return;

        setMessages(msgs);

        const senderIds = msgs.map((m) => m.sender_id).filter(Boolean);
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
    loadMissingProfiles,
    loadMembers,
    markGroupRead,
    scrollDown,
  ]);

  useEffect(() => {
    if (!id || !user?.id || !isMember) return;

    const channel = supabase.channel(`group:${id}`);

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

          if (user?.id) {
            await markGroupRead(id, user.id);
          }

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user?.id, isMember, mergeMessage, loadMissingProfiles, markGroupRead, scrollDown]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !id || sending || !isMember) return;

    const text = input.trim();
    setSending(true);

    const { error } = await supabase.from("group_chat_messages").insert({
      group_chat_id: id,
      sender_id: user.id,
      content: text,
    });

    if (error) {
      console.error("Ошибка отправки сообщения:", error);
    } else {
      setInput("");
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

  const openAddMembersModal = async () => {
  if (!id || !user?.id) return;
  if (myRole !== "owner" && myRole !== "admin") return;

  const memberIds = members.map((m) => m.user_id);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, username")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Ошибка загрузки пользователей:", error);
    alert(`Ошибка загрузки пользователей: ${error.message}`);
    return;
  }

  const filtered =
    (data as Profile[] | null)?.filter(
      (profile) =>
        profile.id !== user.id && !memberIds.includes(profile.id)
    ) || [];

  setAllUsers(filtered);
  setUserSearch("");
  setIsAddMembersOpen(true);
};

const addMember = async (targetUserId: string) => {
  if (!id || !user?.id) return;
  if (myRole !== "owner" && myRole !== "admin") return;

  setAddingUserId(targetUserId);

  const { error } = await supabase.from("group_chat_members").insert({
    group_chat_id: id,
    user_id: targetUserId,
    role: "member",
    added_by: user.id,
  });

  if (error) {
    console.error("Ошибка добавления участника:", error);
    alert(`Ошибка добавления: ${error.message}`);
    setAddingUserId(null);
    return;
  }

  await loadMembers(id, user.id);

  setAllUsers((prev) => prev.filter((u) => u.id !== targetUserId));
  setAddingUserId(null);
 };

  const getProfileById = (userId: string) => {
    return profiles.find((p) => p.id === userId) ?? null;
  };

  const getDisplayName = (sender: Profile | null) => {
    return sender?.full_name || sender?.username || "Пользователь";
  };

  if (!user && !loading) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-gray-50 dark:bg-[#020617]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group || isMember === false) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-gray-50 dark:bg-[#020617] px-6">
        <div className="max-w-md w-full text-center bg-white dark:bg-gray-900 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-800 shadow-xl">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={26} className="text-indigo-500" />
          </div>

          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            Группа недоступна
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Возможно, тебя нет в этой группе или она была удалена.
          </p>

          <button
            onClick={() => router.push("/chat")}
            className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
          >
            Назад к чатам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-[#020617] transition-colors duration-500 font-sans">
      <header className="flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
          >
            <ArrowLeft size={22} />
          </button>

          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            className="flex items-center gap-3 min-w-0 text-left p-0 m-0 bg-transparent border-none rounded-none"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
                {group?.avatar_url ? (
                  <Image
                    src={group.avatar_url}
                    alt="group avatar"
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Users size={20} />
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
                {group?.title || "Группа"}
              </h1>
              <p className="text-[11px] font-medium text-indigo-500 dark:text-indigo-400 truncate">
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

      <main className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Send size={24} className="text-indigo-500" />
              </div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                Пока нет сообщений
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Напиши первым, чтобы начать обсуждение в группе.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            const sender = getProfileById(msg.sender_id);

            return (
              <div
                key={msg.id}
                className={`flex ${
                  isMe ? "justify-end" : "justify-start"
                } animate-in fade-in slide-in-from-bottom-1 duration-300`}
              >
                <div
                  className={`relative max-w-[85%] md:max-w-[70%] px-4 py-2.5 shadow-sm ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-[1.25rem] rounded-tr-none"
                      : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-[1.25rem] rounded-tl-none border border-gray-100 dark:border-gray-700/50"
                  }`}
                >
                  {!isMe && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                        {sender?.avatar_url ? (
                          <Image
                            src={sender.avatar_url}
                            alt="sender avatar"
                            width={20}
                            height={20}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <User size={12} className="text-gray-400" />
                        )}
                      </div>

                      <span className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-300 flex items-center gap-1.5">
                        {getDisplayName(sender)}
                        {sender?.is_verified && (
                          <ShieldCheck size={12} className="text-indigo-500" />
                        )}
                      </span>
                    </div>
                  )}

                  <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap select-text">
                    {msg.content}
                  </p>

                  <div
                    className={`flex items-center justify-end gap-1 mt-1 opacity-70 text-[10px] font-medium ${
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
                </div>
              </div>
            );
          })
        )}

        <div ref={bottomRef} className="h-2" />
      </main>

      <footer className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto flex items-end gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Сообщение..."
            className="flex-1 max-h-32 bg-transparent border-none outline-none py-2.5 px-3 text-[15px] text-gray-900 dark:text-white placeholder:text-gray-400 resize-none"
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className={`p-3 rounded-2xl transition-all active:scale-95 ${
              input.trim() && !sending
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Send size={18} strokeWidth={2.5} />
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
      onAddMember={openAddMembersModal}
       />
       {isAddMembersOpen && (
  <div className="fixed inset-0 z-[60]">
    <div
      className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      onClick={() => setIsAddMembersOpen(false)}
    />

    <div className="absolute inset-x-0 top-1/2 mx-auto w-full max-w-lg -translate-y-1/2 rounded-[2rem] border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f172a] shadow-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white">
            Добавить участника
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Выбери пользователя из списка
          </p>
        </div>

        <button
          onClick={() => setIsAddMembersOpen(false)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <input
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          placeholder="Поиск по имени или username..."
          className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
        />
      </div>

      <div className="max-h-[420px] overflow-y-auto p-4 space-y-3">
        {allUsers
          .filter((profile) => {
            const q = userSearch.trim().toLowerCase();
            if (!q) return true;

            const fullName = profile.full_name?.toLowerCase() || "";
            const username = profile.username?.toLowerCase() || "";

            return fullName.includes(q) || username.includes(q);
          })
          .map((profile) => {
            const name =
              profile.full_name || profile.username || "Пользователь";

            return (
              <div
                key={profile.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/5 p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={name}
                        width={44}
                        height={44}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {profile.username ? `@${profile.username}` : "Без username"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => addMember(profile.id)}
                  disabled={addingUserId === profile.id}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60"
                >
                  {addingUserId === profile.id ? "Добавление..." : "Добавить"}
                </button>
              </div>
            );
          })}

        {allUsers.filter((profile) => {
          const q = userSearch.trim().toLowerCase();
          if (!q) return true;

          const fullName = profile.full_name?.toLowerCase() || "";
          const username = profile.username?.toLowerCase() || "";

          return fullName.includes(q) || username.includes(q);
        }).length === 0 && (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            Нет пользователей для добавления
          </div>
        )}
      </div>
    </div>
  </div>
)}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}