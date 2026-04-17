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
  CornerUpLeft,
  Paperclip,
  X,
  Smile,
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
    reply_to?: { id: string; body: string; sender_name: string };
    reactions?: Record<string, string[]>; // emoji -> userIds
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

const REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

const pickRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

const newUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
  const [replyTo, setReplyTo] = useState<{ id: string; body: string; sender_name: string } | null>(null);
  const [reactionTarget, setReactionTarget] = useState<string | null>(null); // message id
  const [longPressTimer, setLongPressTimer] = useState<any>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingResetRef = useRef<any>(null);
  const typingThrottleRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
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

  const mergeMessage = useCallback((incoming: MessageRow) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === incoming.id);
      if (exists) return prev.map((m) => (m.id === incoming.id ? incoming : m));
      return [...prev, incoming].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
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
      await supabase
        .from("messages")
        .update({ is_read: true, metadata: { ...(message.metadata || {}), read_by: nextReadBy } })
        .eq("id", message.id);
    },
    [user?.id]
  );

  const loadMessages = useCallback(
    async (conversationIds: string[]) => {
      if (!conversationIds.length) { setMessages([]); return; }
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true });
      if (error) { console.error("loadMessages error:", error); return; }
      const nextMessages = (data || []) as MessageRow[];
      setMessages(nextMessages);
      setTimeout(() => scrollDown("auto"), 50);
      if (user?.id) {
        const unread = nextMessages.filter(
          (msg) => msg.receiver_id === user.id && !msg.is_read
        );
        await Promise.all(unread.map(markIncomingAsRead));
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

      if (findError) throw findError;

      if (existing && existing.length > 0) {
        const ids = existing.map((c: any) => c.id);
        const { data: latestMessages } = await supabase
          .from("messages")
          .select("conversation_id, created_at")
          .in("conversation_id", ids)
          .order("created_at", { ascending: false })
          .limit(1);
        const primaryConversationId =
          latestMessages?.[0]?.conversation_id || existing[0].id;
        return { primaryConversationId, allConversationIds: ids };
      }

      const newId = newUUID();
      const { error: insertError } = await supabase.from("conversations").insert({
        id: newId,
        user1_id: currentUserId,
        user2_id: peerUserId,
        type: "direct",
      });
      if (insertError) throw insertError;
      return { primaryConversationId: newId, allConversationIds: [newId] };
    },
    []
  );

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const currentUser = data?.user ?? null;
      setUser(currentUser);
      if (!currentUser) router.push("/login");
    });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!otherUserId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_verified, university:universities(id, name)")
        .eq("id", otherUserId)
        .maybeSingle();
      if (!active) return;
      setOtherUser(
        data
          ? ({ ...(data as any), university: pickRelation((data as any).university) } as OtherProfile)
          : null
      );
    })();
    return () => { active = false; };
  }, [otherUserId]);

  useEffect(() => {
    if (!user?.id || !otherUserId) return;
    if (user.id === otherUserId) { router.replace("/chat"); return; }
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
    return () => { active = false; };
  }, [ensureConversation, loadMessages, otherUserId, router, user?.id]);

  useEffect(() => {
    if (!relatedConversationIds.length || !user?.id) return;
    const channel = supabase.channel(`chat:${user.id}:${otherUserId || "direct"}`);
    channelRef.current = channel;

    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const message = payload.new as MessageRow;
          if (!relatedConversationIds.includes(message.conversation_id)) return;
          mergeMessage(message);
          setTimeout(() => scrollDown(), 50);
          if (message.receiver_id === user.id) await markIncomingAsRead(message);
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" },
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
        if (typingResetRef.current) clearTimeout(typingResetRef.current);
        typingResetRef.current = setTimeout(() => setTypingUser(null), 2200);
      })
      .subscribe();

    return () => {
      channelRef.current = null;
      if (typingResetRef.current) clearTimeout(typingResetRef.current);
      supabase.removeChannel(channel);
    };
  }, [relatedConversationIds, user?.id, otherUserId, markIncomingAsRead, mergeMessage, scrollDown]);

  useEffect(() => { resizeTextarea(); }, [input, resizeTextarea]);

  // Close reaction picker on outside click
  useEffect(() => {
    if (!reactionTarget) return;
    const handler = () => setReactionTarget(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [reactionTarget]);

  const sendTyping = useCallback(() => {
    if (!channelRef.current || !user?.id || !conversationId) return;
    if (typingThrottleRef.current) return;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: user.id } });
    typingThrottleRef.current = setTimeout(() => { typingThrottleRef.current = null; }, 1200);
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
      metadata: {
        read_by: [user.id],
        ...(replyTo ? { reply_to: replyTo } : {}),
      },
    };

    setReplyTo(null);
    mergeMessage(optimisticMessage);
    setTimeout(() => scrollDown(), 30);

    const { error } = await supabase.from("messages").insert({
      id: optimisticMessage.id,
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: otherUserId,
      body: text,
      is_read: false,
      metadata: optimisticMessage.metadata,
    });

    if (error) {
      console.error("sendMessage error:", error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setInput(text);
    }

    setSending(false);
  };

  const addReaction = async (messageId: string, emoji: string) => {
    setReactionTarget(null);
    if (!user?.id) return;
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    const reactions = { ...(msg.metadata?.reactions || {}) };
    const users = reactions[emoji] ? [...reactions[emoji]] : [];
    const idx = users.indexOf(user.id);
    if (idx >= 0) users.splice(idx, 1);
    else users.push(user.id);

    if (users.length === 0) delete reactions[emoji];
    else reactions[emoji] = users;

    await supabase
      .from("messages")
      .update({ metadata: { ...(msg.metadata || {}), reactions } })
      .eq("id", messageId);
  };

  const handleLongPress = (msgId: string) => {
    const timer = setTimeout(() => {
      setReactionTarget(msgId);
    }, 500);
    setLongPressTimer(timer);
  };

  const cancelLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  if (!user && !loading) return null;

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-[#0a0a0f] font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all shrink-0"
          >
            <ArrowLeft size={20} />
          </button>

          <Link href={otherUser?.id ? `/profile/${otherUser.id}` : "#"} className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                {otherUser?.avatar_url ? (
                  <Image src={otherUser.avatar_url} alt="avatar" width={36} height={36} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User size={18} />
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-[14px] font-bold text-gray-900 dark:text-white truncate">
                  {otherUser?.full_name || "Пользователь"}
                </h1>
                {otherUser?.is_verified && <ShieldCheck size={13} className="text-indigo-500 shrink-0" />}
              </div>

              <div className="flex items-center gap-1">
                {typingUser ? (
                  <TypingDots />
                ) : (
                  <>
                    {otherUser?.university?.name && (
                      <GraduationCap size={11} className="text-indigo-400 shrink-0" />
                    )}
                    <p className="text-[11px] text-indigo-400 truncate">
                      {otherUser?.university?.name || "Студент"}
                    </p>
                  </>
                )}
              </div>
            </div>
          </Link>
        </div>

        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <MoreHorizontal size={20} />
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scroll-smooth custom-scrollbar">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-xs">
              <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Send size={22} className="text-indigo-400" />
              </div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Начни разговор</h2>
              <p className="text-sm text-gray-400 mt-1">Напиши, чтобы обсудить жильё.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const showDateSep = !prevMsg || !isSameDay(prevMsg.created_at, msg.created_at);
              const isMe = msg.sender_id === user?.id;
              const isRead =
                Boolean(msg.is_read) ||
                Boolean(msg.metadata?.read_by?.includes(msg.receiver_id));

              const reactions = msg.metadata?.reactions || {};
              const hasReactions = Object.keys(reactions).length > 0;
              const replyTo = msg.metadata?.reply_to;

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="flex justify-center my-4">
                      <span className="text-[11px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                        {formatDateSeparator(msg.created_at)}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1 group relative`}
                    onMouseDown={() => handleLongPress(msg.id)}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    onTouchStart={() => handleLongPress(msg.id)}
                    onTouchEnd={cancelLongPress}
                  >
                    {/* Reaction picker */}
                    {reactionTarget === msg.id && (
                      <div
                        className={`absolute ${isMe ? "right-0" : "left-0"} -top-12 z-30 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-2xl px-2 py-1.5 shadow-xl border border-gray-100 dark:border-gray-700`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(msg.id, emoji)}
                            className="text-xl hover:scale-125 transition-transform"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Reply button on hover */}
                    <button
                      onClick={() =>
                        setReplyTo({
                          id: msg.id,
                          body: msg.body,
                          sender_name: isMe
                            ? "Вы"
                            : otherUser?.full_name || "Собеседник",
                        })
                      }
                      className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-full text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all self-end mb-1 shrink-0 ${
                        isMe ? "order-first mr-1" : "order-last ml-1"
                      }`}
                    >
                      <CornerUpLeft size={13} />
                    </button>

                    <div
                      className={`relative max-w-[80%] md:max-w-[65%] px-3.5 py-2.5 shadow-sm ${
                        isMe
                          ? "bg-indigo-600 text-white rounded-[1.1rem] rounded-tr-sm"
                          : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-[1.1rem] rounded-tl-sm border border-gray-100 dark:border-gray-700/50"
                      }`}
                    >
                      {/* Reply quote */}
                      {replyTo && (
                        <div
                          className={`mb-2 pl-2 border-l-2 ${
                            isMe ? "border-white/50" : "border-indigo-400"
                          } rounded-sm`}
                        >
                          <p className={`text-[10px] font-semibold ${isMe ? "text-white/70" : "text-indigo-500"}`}>
                            {replyTo.sender_name}
                          </p>
                          <p className={`text-[11px] truncate ${isMe ? "text-white/60" : "text-gray-400"}`}>
                            {replyTo.body}
                          </p>
                        </div>
                      )}

                      <p className="text-[14px] leading-relaxed select-text whitespace-pre-wrap">
                        {msg.body}
                      </p>

                      <div
                        className={`flex items-center justify-end gap-1 mt-0.5 opacity-60 text-[10px] font-medium ${
                          isMe ? "text-white" : "text-gray-400"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {isMe &&
                          (isRead ? (
                            <CheckCheck size={11} className="text-white" />
                          ) : (
                            <Check size={11} className="text-white/70" />
                          ))}
                      </div>

                      {/* Reactions */}
                      {hasReactions && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Object.entries(reactions).map(([emoji, userIds]) => (
                            <button
                              key={emoji}
                              onClick={() => addReaction(msg.id, emoji)}
                              className={`flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full border transition-all ${
                                (userIds as string[]).includes(user?.id || "")
                                  ? "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-600"
                                  : "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
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
            })}
          </>
        )}

        <div ref={bottomRef} className="h-2" />
      </main>

      {/* Reply bar */}
      {replyTo && (
        <div className="px-4 py-2 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <div className="flex-1 pl-3 border-l-2 border-indigo-500 min-w-0">
            <p className="text-[11px] font-semibold text-indigo-500">{replyTo.sender_name}</p>
            <p className="text-[12px] text-gray-400 truncate">{replyTo.body}</p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="px-3 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              // File upload handler — integrate with your storage
              console.log("File selected:", e.target.files?.[0]);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all shrink-0"
          >
            <Paperclip size={18} />
          </button>

          <div className="flex-1 flex items-end bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => { setInput(e.target.value); sendTyping(); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Сообщение..."
              className="flex-1 max-h-32 bg-transparent border-none outline-none text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 resize-none"
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className={`p-2.5 rounded-xl transition-all active:scale-95 shrink-0 ${
              input.trim() && !sending
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Send size={17} strokeWidth={2.5} />
          </button>
        </div>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.08);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-[11px] text-indigo-400 mr-1">печатает</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
