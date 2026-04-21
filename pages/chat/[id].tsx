"use client";
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
  SmilePlus,
  Reply,
  Forward,
  X,
  CornerUpLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Reaction = {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  metadata?: {
    read_by?: string[];
    reply_to?: {
      id: string;
      body: string;
      sender_id: string;
    };
    forwarded?: boolean;
    [key: string]: any;
  } | null;
  is_read?: boolean | null;
  reactions?: Reaction[];
};

type OtherProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  university?: { id: string; name: string } | null;
  is_verified?: boolean | null;
};

type ConversationSummary = {
  id: string;
  other_user_id: string;
  other_user_name: string | null;
  other_user_avatar: string | null;
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const QUICK_REACTIONS = ["❤️", "👍", "👎", "😂", "😮", "😢", "🙏", "👏"];

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// ─── Date separator helper ────────────────────────────────────────────────────

const getDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDay.getTime() === today.getTime()) return "Сегодня";
  if (msgDay.getTime() === yesterday.getTime()) return "Вчера";

  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: msgDay.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
};

const isSameDay = (a: string, b: string): boolean => {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

// ─── Context Menu ──────────────────────────────────────────────────────────────

type ContextMenuState = {
  messageId: string;
  x: number;
  y: number;
  isMe: boolean;
} | null;

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ChatPage() {
  const router = useRouter();
  const rawOtherUserId = router.query.id;
  const otherUserId = Array.isArray(rawOtherUserId) ? rawOtherUserId[0] : rawOtherUserId;

  const [relatedConversationIds, setRelatedConversationIds] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<OtherProfile | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // Reply state
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);

  // Forward state
  const [forwardMessage, setForwardMessage] = useState<MessageRow | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showForwardSheet, setShowForwardSheet] = useState(false);

  // Context menu (long press / right click)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  // Reaction picker
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingResetRef = useRef<any>(null);
  const typingThrottleRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollDown = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, []);

  // ── Reactions ────────────────────────────────────────────────────────────────

  const loadReactions = useCallback(async (messageIds: string[]) => {
    if (!messageIds.length || !user?.id) return;
    const { data, error } = await supabase
      .from("message_reactions")
      .select("message_id, emoji, user_id")
      .in("message_id", messageIds);
    if (error) { console.error("loadReactions error:", error); return; }

    const reactionsMap = new Map<string, Reaction[]>();
    data?.forEach((row: any) => {
      const existing = reactionsMap.get(row.message_id) || [];
      const found = existing.find(r => r.emoji === row.emoji);
      if (found) {
        found.count++;
        found.users.push(row.user_id);
        if (row.user_id === user.id) found.hasReacted = true;
      } else {
        existing.push({ emoji: row.emoji, count: 1, users: [row.user_id], hasReacted: row.user_id === user.id });
      }
      reactionsMap.set(row.message_id, existing);
    });

    setMessages(prev => prev.map(msg => ({ ...msg, reactions: reactionsMap.get(msg.id) || [] })));
  }, [user?.id]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.id) return;
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    if (message.sender_id === user.id) return;

    const existingReaction = message.reactions?.find(r => r.hasReacted);
    const isSameEmoji = existingReaction?.emoji === emoji;

    // Optimistic update
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      let reactions = msg.reactions || [];

      if (existingReaction) {
        if (isSameEmoji) {
          return {
            ...msg,
            reactions: reactions
              .map(r => r.emoji === emoji ? { ...r, count: r.count - 1, hasReacted: false, users: r.users.filter(u => u !== user.id) } : r)
              .filter(r => r.count > 0)
          };
        } else {
          const withoutOld = reactions
            .map(r => r.emoji === existingReaction.emoji ? { ...r, count: r.count - 1, hasReacted: false, users: r.users.filter(u => u !== user.id) } : r)
            .filter(r => r.count > 0);
          const existingNew = withoutOld.find(r => r.emoji === emoji);
          if (existingNew) {
            return { ...msg, reactions: withoutOld.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, hasReacted: true, users: [...r.users, user.id] } : r) };
          }
          return { ...msg, reactions: [...withoutOld, { emoji, count: 1, hasReacted: true, users: [user.id] }] };
        }
      } else {
        const existing = reactions.find(r => r.emoji === emoji);
        if (existing) {
          return { ...msg, reactions: reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, hasReacted: true, users: [...r.users, user.id] } : r) };
        }
        return { ...msg, reactions: [...reactions, { emoji, count: 1, hasReacted: true, users: [user.id] }] };
      }
    }));

    // DB sync
    if (existingReaction) {
      if (isSameEmoji) {
        await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", user.id).eq("emoji", emoji);
      } else {
        await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", user.id);
        await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
      }
    } else {
      await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
    }
  }, [user?.id, messages]);

  // ── Context Menu ─────────────────────────────────────────────────────────────

  const openContextMenu = useCallback((e: React.MouseEvent | React.TouchEvent, msg: MessageRow) => {
    e.preventDefault();
    const isMe = msg.sender_id === user?.id;

    let x: number, y: number;
    if ("touches" in e) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = (e as React.MouseEvent).clientX;
      y = (e as React.MouseEvent).clientY;
    }

    // Clamp to viewport
    const menuW = 200;
    const menuH = 180;
    x = Math.min(x, window.innerWidth - menuW - 8);
    y = Math.min(y, window.innerHeight - menuH - 8);
    x = Math.max(x, 8);
    y = Math.max(y, 8);

    setContextMenu({ messageId: msg.id, x, y, isMe });
    setReactionTarget(null);
  }, [user?.id]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    setReactionTarget(null);
  }, []);

  // Long press handlers
  const handleTouchStart = useCallback((e: React.TouchEvent, msg: MessageRow) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      openContextMenu(e, msg);
    }, 500);
  }, [openContextMenu]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // Right-click for desktop
  const handleContextMenu = useCallback((e: React.MouseEvent, msg: MessageRow) => {
    e.preventDefault();
    openContextMenu(e, msg);
  }, [openContextMenu]);

  // Close context menu on outside click
  useEffect(() => {
    const close = () => closeContextMenu();
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [closeContextMenu]);

  // ── Reply ────────────────────────────────────────────────────────────────────

  const handleReply = useCallback((msg: MessageRow) => {
    setReplyTo(msg);
    closeContextMenu();
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, [closeContextMenu]);

  const cancelReply = useCallback(() => setReplyTo(null), []);

  // Scroll to replied message
  const scrollToMessage = useCallback((msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight-message");
    setTimeout(() => el.classList.remove("highlight-message"), 1500);
  }, []);

  // ── Forward ──────────────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("conversations")
      .select("id, user1_id, user2_id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq("type", "direct");

    if (error || !data) return;

    // Get other user profiles
    const otherIds = data.map((c: any) => c.user1_id === user.id ? c.user2_id : c.user1_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", otherIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const summaries: ConversationSummary[] = data
      .filter((c: any) => {
        const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id;
        return otherId !== otherUserId; // exclude current chat
      })
      .map((c: any) => {
        const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id;
        const profile = profileMap.get(otherId) as any;
        return { id: c.id, other_user_id: otherId, other_user_name: profile?.full_name ?? null, other_user_avatar: profile?.avatar_url ?? null };
      });

    setConversations(summaries);
  }, [user?.id, otherUserId]);

  const handleForward = useCallback((msg: MessageRow) => {
    setForwardMessage(msg);
    loadConversations();
    setShowForwardSheet(true);
    closeContextMenu();
  }, [closeContextMenu, loadConversations]);

  const sendForward = useCallback(async (targetConversation: ConversationSummary) => {
    if (!forwardMessage || !user?.id) return;
    setShowForwardSheet(false);

    const { error } = await supabase.from("messages").insert({
      id: newUUID(),
      conversation_id: targetConversation.id,
      sender_id: user.id,
      receiver_id: targetConversation.other_user_id,
      body: forwardMessage.body,
      is_read: false,
      metadata: { read_by: [user.id], forwarded: true },
    });

    if (error) console.error("sendForward error:", error);
    setForwardMessage(null);
  }, [forwardMessage, user?.id]);

  // ── Messages ─────────────────────────────────────────────────────────────────

  const mergeMessage = useCallback((incoming: MessageRow) => {
    setMessages(prev => {
      const exists = prev.some(m => m.id === incoming.id);
      if (exists) return prev.map(m => m.id === incoming.id ? { ...m, ...incoming } : m);
      return [...prev, incoming].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
  }, []);

  const markIncomingAsRead = useCallback(async (message: MessageRow) => {
    if (!user?.id) return;
    if (message.receiver_id !== user.id) return;
    const currentReadBy = Array.isArray(message.metadata?.read_by) ? message.metadata?.read_by : [];
    if (message.is_read && currentReadBy.includes(user.id)) return;
    const nextReadBy = Array.from(new Set([...currentReadBy, user.id]));
    const { error } = await supabase
      .from("messages")
      .update({ is_read: true, metadata: { ...(message.metadata || {}), read_by: nextReadBy } })
      .eq("id", message.id);
    if (error) console.error("markIncomingAsRead error:", error);
  }, [user?.id]);

  const loadMessages = useCallback(async (conversationIds: string[]) => {
    if (!conversationIds.length) { setMessages([]); return; }
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true });
    if (error) { console.error("loadMessages error:", error); return; }
    const nextMessages = (data || []) as MessageRow[];
    setMessages(nextMessages);
    if (nextMessages.length > 0) await loadReactions(nextMessages.map(m => m.id));
    setTimeout(() => scrollDown("auto"), 50);
    if (user?.id) await Promise.all(nextMessages.filter(msg => msg.receiver_id === user.id && !msg.is_read).map(markIncomingAsRead));
  }, [markIncomingAsRead, scrollDown, user?.id, loadReactions]);

  const ensureConversation = useCallback(async (currentUserId: string, peerUserId: string) => {
    const { data: existing, error: findError } = await supabase
      .from("conversations")
      .select("id, user1_id, user2_id, created_at")
      .eq("type", "direct")
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${peerUserId}),and(user1_id.eq.${peerUserId},user2_id.eq.${currentUserId})`)
      .order("created_at", { ascending: true });
    if (findError) { console.error("ensureConversation find error:", findError); throw findError; }

    if (existing && existing.length > 0) {
      const ids = existing.map((c: any) => c.id);
      const { data: latestMessages } = await supabase
        .from("messages")
        .select("conversation_id, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(1);
      return { primaryConversationId: latestMessages?.[0]?.conversation_id || existing[0].id, allConversationIds: ids };
    }

    const newId = newUUID();
    const { error: insertError } = await supabase.from("conversations").insert({ id: newId, user1_id: currentUserId, user2_id: peerUserId, type: "direct" });
    if (insertError) { console.error("ensureConversation insert error:", insertError); throw insertError; }
    return { primaryConversationId: newId, allConversationIds: [newId] };
  }, []);

  // ── Send ─────────────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!input.trim() || !user || !conversationId || !otherUserId || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    cancelReply();

    const msgMetadata: any = { read_by: [user.id] };
    if (replyTo) {
      msgMetadata.reply_to = {
        id: replyTo.id,
        body: replyTo.body,
        sender_id: replyTo.sender_id,
      };
    }

    const optimisticMessage: MessageRow = {
      id: newUUID(),
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: otherUserId,
      body: text,
      created_at: new Date().toISOString(),
      is_read: false,
      metadata: msgMetadata,
      reactions: [],
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
      metadata: msgMetadata,
    });

    if (error) {
      console.error("sendMessage error:", error);
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setInput(text);
    }
    setSending(false);
  };

  // ── Typing ────────────────────────────────────────────────────────────────────

  const sendTyping = useCallback(() => {
    if (!channelRef.current || !user?.id || !conversationId) return;
    if (typingThrottleRef.current) return;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: user.id } });
    typingThrottleRef.current = setTimeout(() => { typingThrottleRef.current = null; }, 1200);
  }, [conversationId, user?.id]);

  // ── Effects ───────────────────────────────────────────────────────────────────

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
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_verified, university:universities(id, name)")
        .eq("id", otherUserId)
        .maybeSingle();
      if (!active || error) return;
      setOtherUser(data ? ({ ...(data as any), university: pickRelation((data as any).university) } as OtherProfile) : null);
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
      } catch (e) {
        console.error("conversation init error:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [ensureConversation, loadMessages, otherUserId, router, user?.id]);

  useEffect(() => {
    if (!relatedConversationIds.length || !user?.id) return;
    // Используем conversationId как имя канала — одинаковое для обоих собеседников
    const channelName = `conversation:${relatedConversationIds[0]}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const message = payload.new as MessageRow;
        if (!relatedConversationIds.includes(message.conversation_id)) return;
        mergeMessage(message);
        setTimeout(() => scrollDown(), 50);
        if (message.receiver_id === user.id) await markIncomingAsRead(message);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const message = payload.new as MessageRow;
        if (!relatedConversationIds.includes(message.conversation_id)) return;
        mergeMessage(message);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions" }, (payload) => {
        const reaction = payload.new as any;
        if (reaction.user_id === user?.id) return;
        setMessages(prev => prev.map(msg => {
          if (msg.id !== reaction.message_id) return msg;
          const reactions = msg.reactions || [];
          const withoutOld = reactions
            .map(r => r.users.includes(reaction.user_id) ? { ...r, count: r.count - 1, users: r.users.filter(u => u !== reaction.user_id) } : r)
            .filter(r => r.count > 0);
          const existing = withoutOld.find(r => r.emoji === reaction.emoji);
          if (existing) {
            return { ...msg, reactions: withoutOld.map(r => r.emoji === reaction.emoji ? { ...r, count: r.count + 1, users: [...r.users, reaction.user_id] } : r) };
          }
          return { ...msg, reactions: [...withoutOld, { emoji: reaction.emoji, count: 1, hasReacted: false, users: [reaction.user_id] }] };
        }));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" }, (payload) => {
        const oldReaction = payload.old as any;
        if (!oldReaction?.message_id || !oldReaction?.emoji) return;
        setMessages(prev => prev.map(msg => {
          if (msg.id !== oldReaction.message_id) return msg;
          const reactions = msg.reactions || [];
          const target = reactions.find(r => r.emoji === oldReaction.emoji);
          if (!target) return msg;
          const newUsers = target.users.filter(u => u !== oldReaction.user_id);
          if (newUsers.length === 0) return { ...msg, reactions: reactions.filter(r => r.emoji !== oldReaction.emoji) };
          return {
            ...msg,
            reactions: reactions.map(r => r.emoji === oldReaction.emoji
              ? { ...r, count: newUsers.length, users: newUsers, hasReacted: oldReaction.user_id !== user?.id ? r.hasReacted : false }
              : r
            )
          };
        }));
      })
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

  const renderStatus = () => {
    if (typingUser) return "набирает сообщение...";
    if (otherUser?.university?.name) return otherUser.university.name;
    return "Студент";
  };

  if (!user && !loading) return null;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-[#020617] transition-colors duration-500 font-sans">

      {/* ── Context Menu ─────────────────────────────────────────────────────── */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onMouseDown={(e) => { e.stopPropagation(); closeContextMenu(); }}
          />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden w-52 animate-in fade-in zoom-in-95 duration-150"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Reaction row inside context menu */}
            <div className="flex items-center gap-1 px-2 py-2 border-b border-gray-100 dark:border-gray-700">
              {QUICK_REACTIONS.map(emoji => {
                const msg = messages.find(m => m.id === contextMenu.messageId);
                const isMe = msg?.sender_id === user?.id;
                const disabled = isMe;
                return (
                  <button
                    key={emoji}
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) toggleReaction(contextMenu.messageId, emoji);
                      closeContextMenu();
                    }}
                    className={`w-9 h-9 flex items-center justify-center text-xl rounded-full transition-all
                      ${disabled ? "opacity-30 cursor-not-allowed" : "hover:scale-125 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95"}`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <button
              onClick={() => {
                const msg = messages.find(m => m.id === contextMenu.messageId);
                if (msg) handleReply(msg);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <Reply size={16} className="text-indigo-500" />
              Ответить
            </button>

            <button
              onClick={() => {
                const msg = messages.find(m => m.id === contextMenu.messageId);
                if (msg) handleForward(msg);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <Forward size={16} className="text-indigo-500" />
              Переслать
            </button>
          </div>
        </>
      )}

      {/* ── Forward Sheet ─────────────────────────────────────────────────────── */}
      {showForwardSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full sm:w-96 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-white text-base">Переслать сообщение</h2>
              <button
                onClick={() => { setShowForwardSheet(false); setForwardMessage(null); }}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Message preview */}
            {forwardMessage && (
              <div className="mx-4 mt-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border-l-4 border-indigo-400">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Сообщение для пересылки</p>
                <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2">{forwardMessage.body}</p>
              </div>
            )}

            <div className="px-4 py-3 max-h-72 overflow-y-auto space-y-1">
              {conversations.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">Нет других чатов</p>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => sendForward(conv)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                      {conv.other_user_avatar ? (
                        <Image src={conv.other_user_avatar} alt="" width={40} height={40} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={18} /></div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {conv.other_user_name || "Пользователь"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all shrink-0"
          >
            <ArrowLeft size={22} />
          </button>

          <Link href={otherUser?.id ? `/profile/${otherUser.id}` : "#"} className="flex items-center gap-3 min-w-0">
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
                {otherUser?.is_verified && <ShieldCheck size={14} className="text-indigo-500 shrink-0" />}
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                {otherUser?.university?.name && !typingUser && <GraduationCap size={12} className="text-indigo-500 shrink-0" />}
                <p className="text-[11px] font-medium text-indigo-500 dark:text-indigo-400 truncate">{renderStatus()}</p>
              </div>
            </div>
          </Link>
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0">
          <MoreHorizontal size={20} />
        </button>
      </header>

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      <main ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-1 scroll-smooth custom-scrollbar">
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
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Начни разговор первым</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Напиши собеседнику, чтобы обсудить жильё и совместимость.</p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === user?.id;
            const isRead = Boolean(msg.is_read) || Boolean(msg.metadata?.read_by?.includes(msg.receiver_id));
            const hasReactions = msg.reactions && msg.reactions.length > 0;
            const replyData = msg.metadata?.reply_to;
            const isForwarded = msg.metadata?.forwarded;
            const showDateSep = index === 0 || !isSameDay(messages[index - 1].created_at, msg.created_at);

            return (
              <div key={msg.id}>
                {/* ── Date separator ─────────────────────────────── */}
                {showDateSep && (
                  <div className="flex items-center justify-center my-4">
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700/50">
                      {getDateLabel(msg.created_at)}
                    </span>
                  </div>
                )}
              <div
                id={`msg-${msg.id}`}
                className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1 duration-300 group mb-1`}
              >
                {/* Swipe-to-reply hint (left side for others, right side for mine) */}
                <div
                  className={`relative max-w-[85%] md:max-w-[70%] flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Bubble */}
                  <div
                    onContextMenu={(e) => handleContextMenu(e, msg)}
                    onTouchStart={(e) => handleTouchStart(e, msg)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    className={`relative cursor-pointer select-none ${isMe ? "" : ""}`}
                  >
                    {/* Forwarded label */}
                    {isForwarded && (
                      <div className={`flex items-center gap-1 mb-1 ${isMe ? "justify-end" : "justify-start"}`}>
                        <Forward size={11} className="text-gray-400" />
                        <span className="text-[10px] text-gray-400 font-medium">Переслано</span>
                      </div>
                    )}

                    <div className={`px-4 py-2.5 shadow-sm ${
                      isMe
                        ? "bg-indigo-600 text-white rounded-[1.25rem] rounded-tr-none"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-[1.25rem] rounded-tl-none border border-gray-100 dark:border-gray-700/50"
                    }`}>

                      {/* Reply preview inside bubble */}
                      {replyData && (
                        <button
                          onClick={() => scrollToMessage(replyData.id)}
                          className={`block w-full text-left mb-2 px-3 py-2 rounded-xl border-l-4 transition-opacity hover:opacity-80 ${
                            isMe
                              ? "bg-indigo-700/50 border-white/60"
                              : "bg-gray-50 dark:bg-gray-700/50 border-indigo-400"
                          }`}
                        >
                          <p className={`text-[10px] font-semibold mb-0.5 ${isMe ? "text-white/80" : "text-indigo-500"}`}>
                            {replyData.sender_id === user?.id ? "Вы" : otherUser?.full_name || "Собеседник"}
                          </p>
                          <p className={`text-xs line-clamp-1 ${isMe ? "text-white/70" : "text-gray-500 dark:text-gray-400"}`}>
                            {replyData.body}
                          </p>
                        </button>
                      )}

                      <p className="text-[15px] leading-relaxed select-text whitespace-pre-wrap">{msg.body}</p>

                      <div className={`flex items-center justify-end gap-1 mt-1 opacity-70 text-[10px] font-medium ${isMe ? "text-white" : "text-gray-400"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {isMe && (isRead
                          ? <CheckCheck size={12} className="text-white" />
                          : <Check size={12} className="text-white/80" />
                        )}
                      </div>
                    </div>

                    {/* Reactions */}
                    {hasReactions && (
                      <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? "justify-end" : "justify-start"} px-1`}>
                        {msg.reactions?.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isMe) toggleReaction(msg.id, reaction.emoji);
                            }}
                            disabled={isMe}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all active:scale-95 ${
                              reaction.hasReacted
                                ? "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-sm"
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                            } ${isMe ? "cursor-default" : "cursor-pointer"}`}
                          >
                            <span>{reaction.emoji}</span>
                            {reaction.count > 1 && <span className="font-semibold">{reaction.count}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick reply button on hover */}
                  <button
                    onClick={() => handleReply(msg)}
                    className={`shrink-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity
                      w-7 h-7 flex items-center justify-center rounded-full
                      bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400
                      hover:bg-gray-200 dark:hover:bg-gray-600 shadow-sm`}
                    title="Ответить"
                  >
                    <CornerUpLeft size={13} />
                  </button>
                </div>
              </div>
            </div>
            );
          })
        )}
        <div ref={bottomRef} className="h-2" />
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">

        {/* Reply bar */}
        {replyTo && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom-2 duration-200">
            <div className="w-0.5 h-full min-h-[2.5rem] bg-indigo-500 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-500 mb-0.5">
                {replyTo.sender_id === user?.id ? "Вы" : otherUser?.full_name || "Собеседник"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{replyTo.body}</p>
            </div>
            <button
              onClick={cancelReply}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-colors shrink-0"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="p-4">
          <div className="max-w-4xl mx-auto flex items-end gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => { setInput(e.target.value); sendTyping(); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
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
        </div>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); }

        @keyframes highlight-pulse {
          0%, 100% { background-color: transparent; }
          30% { background-color: rgba(99, 102, 241, 0.15); }
        }
        .highlight-message {
          border-radius: 1rem;
          animation: highlight-pulse 1.4s ease;
        }
      `}</style>
    </div>
  );
}

function otherUserAvatarOrFallback(otherUser: OtherProfile | null) {
  if (otherUser?.avatar_url) {
    return <Image src={otherUser.avatar_url} alt="avatar" width={40} height={40} className="object-cover w-full h-full" />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center text-gray-400">
      <User size={20} />
    </div>
  );
}
