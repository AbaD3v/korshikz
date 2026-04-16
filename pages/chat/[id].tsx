import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Send,
  Check,
  CheckCheck,
  User,
  MoreHorizontal,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  metadata?: {
    read_by?: string[];
    [key: string]: any;
  } | null;
  is_read?: boolean | null;
};

type OtherProfile = {
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

const newUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function ChatPage() {
  const router = useRouter();

  const rawOtherUserId = router.query.id;
  const otherUserId = Array.isArray(rawOtherUserId)
    ? rawOtherUserId[0]
    : rawOtherUserId;
const [relatedConversationIds, setRelatedConversationIds] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [otherUser, setOtherUser] = useState<OtherProfile | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingResetRef = useRef<any>(null);
  const typingThrottleRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  const scrollDown = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, []);

  const mergeMessage = useCallback((incoming: MessageRow) => {
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

  const markIncomingAsRead = useCallback(
    async (message: MessageRow) => {
      if (!user?.id) return;
      if (message.receiver_id !== user.id) return;

      const currentReadBy = Array.isArray(message.metadata?.read_by)
        ? message.metadata?.read_by
        : [];

      if (message.is_read && currentReadBy.includes(user.id)) return;

      const nextReadBy = Array.from(new Set([...currentReadBy, user.id]));

      const { error } = await supabase
        .from("messages")
        .update({
          is_read: true,
          metadata: {
            ...(message.metadata || {}),
            read_by: nextReadBy,
          },
        })
        .eq("id", message.id);

      if (error) {
        console.error("markIncomingAsRead error:", error);
      }
    },
    [user?.id]
  );

  const loadMessages = useCallback(
  async (conversationIds: string[]) => {
    if (!conversationIds.length) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("loadMessages error:", error);
      return;
    }

    const nextMessages = (data || []) as MessageRow[];
    setMessages(nextMessages);
    setTimeout(() => scrollDown("auto"), 50);

    if (user?.id) {
      const unreadIncoming = nextMessages.filter(
        (msg) => msg.receiver_id === user.id && !msg.is_read
      );

      await Promise.all(unreadIncoming.map(markIncomingAsRead));
    }
  },
  [markIncomingAsRead, scrollDown, user?.id]
);

  const ensureConversation = useCallback(
  async (currentUserId: string, peerUserId: string) => {
    const { data: existing, error: findError } = await supabase
      .from("conversations")
      .select("id, user1_id, user2_id, created_at")
      .eq("type", "direct")
      .or(
        `and(user1_id.eq.${currentUserId},user2_id.eq.${peerUserId}),and(user1_id.eq.${peerUserId},user2_id.eq.${currentUserId})`
      )
      .order("created_at", { ascending: true });

    if (findError) {
      console.error("ensureConversation find error:", findError);
      throw findError;
    }

    if (existing && existing.length > 0) {
      const ids = existing.map((c: any) => c.id);

      // попробуем выбрать conversation, где было последнее сообщение
      const { data: latestMessages, error: latestError } = await supabase
        .from("messages")
        .select("conversation_id, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(1);

      if (latestError) {
        console.error("ensureConversation latestMessages error:", latestError);
      }

      const primaryConversationId =
        latestMessages?.[0]?.conversation_id || existing[0].id;

      return {
        primaryConversationId,
        allConversationIds: ids,
      };
    }

    const newId = newUUID();

    const { error: insertError } = await supabase.from("conversations").insert({
      id: newId,
      user1_id: currentUserId,
      user2_id: peerUserId,
      type: "direct",
    });

    if (insertError) {
      console.error("ensureConversation insert error:", insertError);
      throw insertError;
    }

    return {
      primaryConversationId: newId,
      allConversationIds: [newId],
    };
  },
  []
);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;

      const currentUser = data?.user ?? null;
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
    if (!otherUserId) return;

    let active = true;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_verified, university:universities(id, name)")
        .eq("id", otherUserId)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("other user load error:", error);
        return;
      }

      setOtherUser(
        data
          ? ({
              ...(data as any),
              university: pickRelation((data as any).university),
            } as OtherProfile)
          : null
      );
    })();

    return () => {
      active = false;
    };
  }, [otherUserId]);

  useEffect(() => {
  if (!user?.id || !otherUserId) return;

  if (user.id === otherUserId) {
    router.replace("/chat");
    return;
  }

  let active = true;

  (async () => {
    setLoading(true);

    try {
      const result = await ensureConversation(user.id, otherUserId);
      if (!active) return;

      setConversationId(result.primaryConversationId);
      setRelatedConversationIds(result.allConversationIds);

      await loadMessages(result.allConversationIds);
    } catch (error) {
      console.error("conversation init error:", error);
    } finally {
      if (active) setLoading(false);
    }
  })();

  return () => {
    active = false;
  };
}, [ensureConversation, loadMessages, otherUserId, router, user?.id]);

  useEffect(() => {
  if (!relatedConversationIds.length || !user?.id) return;

  const channel = supabase.channel(`chat:${user.id}:${otherUserId || "direct"}`);
  channelRef.current = channel;

  channel
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      async (payload) => {
        const message = payload.new as MessageRow;
        if (!relatedConversationIds.includes(message.conversation_id)) return;

        mergeMessage(message);
        setTimeout(() => scrollDown(), 50);

        if (message.receiver_id === user.id) {
          await markIncomingAsRead(message);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        const message = payload.new as MessageRow;
        if (!relatedConversationIds.includes(message.conversation_id)) return;

        mergeMessage(message);
      }
    )
    .on("broadcast", { event: "typing" }, (payload) => {
      const typingPeerId = payload.payload?.user_id;
      if (!typingPeerId || typingPeerId === user.id) return;

      setTypingUser(typingPeerId);

      if (typingResetRef.current) {
        clearTimeout(typingResetRef.current);
      }

      typingResetRef.current = setTimeout(() => {
        setTypingUser(null);
      }, 2200);
    })
    .subscribe();

  return () => {
    channelRef.current = null;
    if (typingResetRef.current) clearTimeout(typingResetRef.current);
    supabase.removeChannel(channel);
  };
}, [
  relatedConversationIds,
  user?.id,
  otherUserId,
  markIncomingAsRead,
  mergeMessage,
  scrollDown,
]);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const sendTyping = useCallback(() => {
    if (!channelRef.current || !user?.id || !conversationId) return;

    if (typingThrottleRef.current) return;

    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: user.id },
    });

    typingThrottleRef.current = setTimeout(() => {
      typingThrottleRef.current = null;
    }, 1200);
  }, [conversationId, user?.id]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !conversationId || !otherUserId || sending) return;

    const text = input.trim();
    setInput("");
    setSending(true);

    const optimisticMessage: MessageRow = {
      id: newUUID(),
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: otherUserId,
      body: text,
      created_at: new Date().toISOString(),
      is_read: false,
      metadata: { read_by: [user.id] },
    };

    mergeMessage(optimisticMessage);
    setTimeout(() => scrollDown(), 30);

    const { error } = await supabase.from("messages").insert({
      id: optimisticMessage.id,
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: otherUserId,
      body: text,
      is_read: false,
      metadata: { read_by: [user.id] },
    });

    if (error) {
      console.error("sendMessage error:", error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setInput(text);
    }

    setSending(false);
  };

  const renderStatus = () => {
    if (typingUser) return "набирает сообщение...";
    if (otherUser?.university?.name) return otherUser.university.name;
    return "Студент";
  };

  if (!user && !loading) return null;

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-[#020617] transition-colors duration-500 font-sans">
      <header className="flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all shrink-0"
          >
            <ArrowLeft size={22} />
          </button>

          <Link
            href={otherUser?.id ? `/profile/${otherUser.id}` : "#"}
            className="flex items-center gap-3 min-w-0"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
                {otherUserAvatarOrFallback(otherUser)}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
                  {otherUser?.full_name || "Пользователь"}
                </h1>

                {otherUser?.is_verified && (
                  <ShieldCheck
                    size={14}
                    className="text-indigo-500 shrink-0"
                  />
                )}
              </div>

              <div className="flex items-center gap-1.5 min-w-0">
                {otherUser?.university?.name && !typingUser && (
                  <GraduationCap
                    size={12}
                    className="text-indigo-500 shrink-0"
                  />
                )}
                <p className="text-[11px] font-medium text-indigo-500 dark:text-indigo-400 truncate">
                  {renderStatus()}
                </p>
              </div>
            </div>
          </Link>
        </div>

        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0">
          <MoreHorizontal size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Send size={24} className="text-indigo-500" />
              </div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                Начни разговор первым
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Напиши собеседнику, чтобы обсудить жильё и совместимость.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            const isRead =
              Boolean(msg.is_read) ||
              Boolean(msg.metadata?.read_by?.includes(msg.receiver_id));

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
                  <p className="text-[15px] leading-relaxed select-text whitespace-pre-wrap">
                    {msg.body}
                  </p>

                  <div
                    className={`flex items-center justify-end gap-1 mt-1 opacity-70 text-[10px] font-medium ${
                      isMe ? "text-white" : "text-gray-400"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {isMe &&
                      (isRead ? (
                        <CheckCheck size={12} className="text-white" />
                      ) : (
                        <Check size={12} className="text-white/80" />
                      ))}
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

function otherUserAvatarOrFallback(otherUser: OtherProfile | null) {
  if (otherUser?.avatar_url) {
    return (
      <Image
        src={otherUser.avatar_url}
        alt="avatar"
        width={40}
        height={40}
        className="object-cover w-full h-full"
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-gray-400">
      <User size={20} />
    </div>
  );
}
