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
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isMember, setIsMember] = useState<boolean | null>(null);

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

  const loadMissingProfiles = useCallback(async (senderIds: string[]) => {
    const uniqueIds = Array.from(new Set(senderIds.filter(Boolean)));
    if (!uniqueIds.length) return;

    const knownIds = new Set(profiles.map((p) => p.id));
    const missingIds = uniqueIds.filter((id) => !knownIds.has(id));
    if (!missingIds.length) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, is_verified")
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
  }, [profiles]);

  const markGroupRead = useCallback(
    async (groupId: string, userId: string) => {
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
    },
    []
  );

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
        const [{ data: membership, error: membershipError }, { data: groupData, error: groupError }] =
          await Promise.all([
            supabase
              .from("group_chat_members")
              .select("group_chat_id")
              .eq("group_chat_id", id)
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase
              .from("group_chats")
              .select("id, title, avatar_url")
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
  }, [id, user?.id, loadMissingProfiles, markGroupRead, scrollDown]);

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

  const getProfileById = (userId: string) => {
    return profiles.find((p) => p.id === userId) ?? null;
  };

  const getDisplayName = (sender: Profile | null) => {
    return sender?.full_name || "Пользователь";
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

          <Link href="/chat" className="flex items-center gap-3 min-w-0">
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
                Групповой чат
              </p>
            </div>
          </Link>
        </div>

        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
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