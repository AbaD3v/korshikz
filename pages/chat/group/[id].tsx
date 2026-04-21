"use client";
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
  Reply,
  Forward,
  X,
  CornerUpLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
}

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

interface GroupMessage {
  id: string;
  group_chat_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  metadata?: {
    reply_to?: {
      id: string;
      content: string;
      sender_id: string;
    };
    forwarded?: boolean;
    [key: string]: any;
  } | null;
  reactions?: Reaction[];
}

interface GroupChat {
  id: string;
  title: string | null;
  avatar_url?: string | null;
}

interface ConversationSummary {
  id: string;
  other_user_id: string;
  other_user_name: string | null;
  other_user_avatar: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_REACTIONS = ["❤️", "👍", "👎", "😂", "😮", "😢", "🙏", "👏"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const newUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

type ContextMenuState = { messageId: string; x: number; y: number; isMe: boolean } | null;

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

// ─── Component ────────────────────────────────────────────────────────────────

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

  // Reply
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);

  // Forward
  const [forwardMessage, setForwardMessage] = useState<GroupMessage | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showForwardSheet, setShowForwardSheet] = useState(false);

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
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

  // ── Profiles ──────────────────────────────────────────────────────────────

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
    if (error) { console.error("Ошибка загрузки профилей:", error); return; }

    setProfiles((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      for (const p of data || []) map.set(p.id, p as Profile);
      return Array.from(map.values());
    });
  }, [profiles]);

  const getProfileById = (userId: string) => profiles.find((p) => p.id === userId) ?? null;
  const getDisplayName = (sender: Profile | null) => sender?.full_name || "Пользователь";

  // ── Messages ──────────────────────────────────────────────────────────────

  const mergeMessage = useCallback((incoming: GroupMessage) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === incoming.id);
      if (exists) return prev.map((m) => (m.id === incoming.id ? { ...m, ...incoming } : m));
      return [...prev, incoming].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  const markGroupRead = useCallback(async (groupId: string, userId: string) => {
    await supabase
      .from("group_chat_reads")
      .upsert({ group_chat_id: groupId, user_id: userId, last_read_at: new Date().toISOString() }, { onConflict: "group_chat_id,user_id" });
  }, []);

  // ── Reactions ─────────────────────────────────────────────────────────────

  const loadReactions = useCallback(async (messageIds: string[]) => {
    if (!messageIds.length || !user?.id) return;
    const { data, error } = await supabase
      .from("group_message_reactions")
      .select("message_id, emoji, user_id")
      .in("message_id", messageIds);
    if (error) { console.error("loadReactions error:", error); return; }

    const map = new Map<string, Reaction[]>();
    data?.forEach((row: any) => {
      const list = map.get(row.message_id) || [];
      const found = list.find(r => r.emoji === row.emoji);
      if (found) {
        found.count++;
        found.users.push(row.user_id);
        if (row.user_id === user.id) found.hasReacted = true;
      } else {
        list.push({ emoji: row.emoji, count: 1, users: [row.user_id], hasReacted: row.user_id === user.id });
      }
      map.set(row.message_id, list);
    });

    setMessages(prev => prev.map(msg => ({ ...msg, reactions: map.get(msg.id) || [] })));
  }, [user?.id]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.id) return;
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    // В группе можно реагировать на любое сообщение, включая своё — как в Telegram
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
        await supabase.from("group_message_reactions").delete().eq("message_id", messageId).eq("user_id", user.id).eq("emoji", emoji);
      } else {
        await supabase.from("group_message_reactions").delete().eq("message_id", messageId).eq("user_id", user.id);
        await supabase.from("group_message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
      }
    } else {
      await supabase.from("group_message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
    }
  }, [user?.id, messages]);

  // ── Context Menu ──────────────────────────────────────────────────────────

  const openContextMenu = useCallback((e: React.MouseEvent | React.TouchEvent, msg: GroupMessage) => {
    e.preventDefault();
    let x: number, y: number;
    if ("touches" in e) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
    else { x = (e as React.MouseEvent).clientX; y = (e as React.MouseEvent).clientY; }

    const menuW = 220; const menuH = 190;
    x = Math.max(8, Math.min(x, window.innerWidth - menuW - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - menuH - 8));

    setContextMenu({ messageId: msg.id, x, y, isMe: msg.sender_id === user?.id });
  }, [user?.id]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleTouchStart = useCallback((e: React.TouchEvent, msg: GroupMessage) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      openContextMenu(e, msg);
    }, 500);
  }, [openContextMenu]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, msg: GroupMessage) => {
    e.preventDefault();
    openContextMenu(e, msg);
  }, [openContextMenu]);

  useEffect(() => {
    const close = () => closeContextMenu();
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("touchstart", close); };
  }, [closeContextMenu]);

  // ── Reply ─────────────────────────────────────────────────────────────────

  const handleReply = useCallback((msg: GroupMessage) => {
    setReplyTo(msg);
    closeContextMenu();
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, [closeContextMenu]);

  const cancelReply = useCallback(() => setReplyTo(null), []);

  const scrollToMessage = useCallback((msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight-message");
    setTimeout(() => el.classList.remove("highlight-message"), 1500);
  }, []);

  // ── Forward ───────────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("conversations")
      .select("id, user1_id, user2_id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq("type", "direct");
    if (error || !data) return;

    const otherIds = data.map((c: any) => c.user1_id === user.id ? c.user2_id : c.user1_id);
    const { data: profilesData } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", otherIds);
    const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));

    setConversations(data.map((c: any) => {
      const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id;
      const p = profileMap.get(otherId) as any;
      return { id: c.id, other_user_id: otherId, other_user_name: p?.full_name ?? null, other_user_avatar: p?.avatar_url ?? null };
    }));
  }, [user?.id]);

  const handleForward = useCallback((msg: GroupMessage) => {
    setForwardMessage(msg);
    loadConversations();
    setShowForwardSheet(true);
    closeContextMenu();
  }, [closeContextMenu, loadConversations]);

  const sendForward = useCallback(async (target: ConversationSummary) => {
    if (!forwardMessage || !user?.id) return;
    setShowForwardSheet(false);
    await supabase.from("messages").insert({
      id: newUUID(),
      conversation_id: target.id,
      sender_id: user.id,
      receiver_id: target.other_user_id,
      body: forwardMessage.content,
      is_read: false,
      metadata: { read_by: [user.id], forwarded: true },
    });
    setForwardMessage(null);
  }, [forwardMessage, user?.id]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!input.trim() || !user || !id || sending || !isMember) return;
    const text = input.trim();
    setSending(true);
    setInput("");
    cancelReply();

    const msgMetadata: any = {};
    if (replyTo) {
      msgMetadata.reply_to = {
        id: replyTo.id,
        content: replyTo.content,
        sender_id: replyTo.sender_id,
      };
    }

    const { error } = await supabase.from("group_chat_messages").insert({
      group_chat_id: id,
      sender_id: user.id,
      content: text,
      ...(Object.keys(msgMetadata).length > 0 ? { metadata: msgMetadata } : {}),
    });

    if (error) {
      console.error("Ошибка отправки сообщения:", error);
      setInput(text);
    }
    setSending(false);
  };

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const currentUser = data.user ?? null;
      setUser(currentUser);
      if (!currentUser) router.push("/login");
    });
    return () => { active = false; };
  }, [router]);

  useEffect(() => { resizeTextarea(); }, [input, resizeTextarea]);

  useEffect(() => {
    if (!id || !user?.id) return;
    let active = true;

    const init = async () => {
      setLoading(true);
      try {
        const [{ data: membership, error: membershipError }, { data: groupData, error: groupError }] = await Promise.all([
          supabase.from("group_chat_members").select("group_chat_id").eq("group_chat_id", id).eq("user_id", user.id).maybeSingle(),
          supabase.from("group_chats").select("id, title, avatar_url").eq("id", id).maybeSingle(),
        ]);

        if (membershipError) console.error("Ошибка проверки membership:", membershipError);
        if (groupError) console.error("Ошибка загрузки группы:", groupError);
        if (!active) return;

        const member = Boolean(membership);
        setIsMember(member);
        setGroup((groupData as GroupChat) ?? null);
        if (!member) { setLoading(false); return; }

        const { data: msgData, error: msgError } = await supabase
          .from("group_chat_messages")
          .select("id, group_chat_id, sender_id, content, created_at, metadata")
          .eq("group_chat_id", id)
          .order("created_at", { ascending: true });

        if (msgError) { console.error("Ошибка загрузки сообщений:", msgError); if (active) setLoading(false); return; }

        const msgs = (msgData as GroupMessage[]) || [];
        if (!active) return;

        setMessages(msgs);
        const senderIds = msgs.map((m) => m.sender_id).filter(Boolean);
        await loadMissingProfiles(senderIds);

        if (msgs.length > 0) await loadReactions(msgs.map(m => m.id));

        await markGroupRead(id, user.id);
        setTimeout(() => scrollDown("auto"), 80);
      } finally {
        if (active) setLoading(false);
      }
    };

    init();
    return () => { active = false; };
  }, [id, user?.id, loadMissingProfiles, markGroupRead, scrollDown, loadReactions]);

  useEffect(() => {
    if (!id || !user?.id || !isMember) return;

    const channel = supabase.channel(`group:${id}`);

    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_chat_messages" },
        async (payload) => {
          const newMessage = payload.new as GroupMessage;
          // Фильтруем на клиенте — надёжнее чем server-side filter
          if (newMessage.group_chat_id !== id) return;
          mergeMessage(newMessage);
          await loadMissingProfiles([newMessage.sender_id]);
          if (user?.id) await markGroupRead(id, user.id);
          setTimeout(() => scrollDown(), 50);
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "group_chat_messages" },
        async (payload) => {
          const updated = payload.new as GroupMessage;
          if (updated.group_chat_id !== id) return;
          mergeMessage(updated);
          await loadMissingProfiles([updated.sender_id]);
        }
      )
      // Realtime реакции
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_message_reactions" },
        (payload) => {
          const reaction = payload.new as any;
          if (reaction.user_id === user?.id) return;
          setMessages(prev => prev.map(msg => {
            if (msg.id !== reaction.message_id) return msg;
            const reactions = msg.reactions || [];
            const withoutOld = reactions
              .map(r => r.users.includes(reaction.user_id) ? { ...r, count: r.count - 1, users: r.users.filter(u => u !== reaction.user_id) } : r)
              .filter(r => r.count > 0);
            const existing = withoutOld.find(r => r.emoji === reaction.emoji);
            if (existing) return { ...msg, reactions: withoutOld.map(r => r.emoji === reaction.emoji ? { ...r, count: r.count + 1, users: [...r.users, reaction.user_id] } : r) };
            return { ...msg, reactions: [...withoutOld, { emoji: reaction.emoji, count: 1, hasReacted: false, users: [reaction.user_id] }] };
          }));
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "group_message_reactions" },
        (payload) => {
          const old = payload.old as any;
          if (!old?.message_id || !old?.emoji) return;
          setMessages(prev => prev.map(msg => {
            if (msg.id !== old.message_id) return msg;
            const reactions = msg.reactions || [];
            const target = reactions.find(r => r.emoji === old.emoji);
            if (!target) return msg;
            const newUsers = target.users.filter(u => u !== old.user_id);
            if (newUsers.length === 0) return { ...msg, reactions: reactions.filter(r => r.emoji !== old.emoji) };
            return {
              ...msg,
              reactions: reactions.map(r => r.emoji === old.emoji
                ? { ...r, count: newUsers.length, users: newUsers, hasReacted: old.user_id !== user?.id ? r.hasReacted : false }
                : r
              )
            };
          }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user?.id, isMember, mergeMessage, loadMissingProfiles, markGroupRead, scrollDown]);

  // ── Render ────────────────────────────────────────────────────────────────

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
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Группа недоступна</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Возможно, тебя нет в этой группе или она была удалена.</p>
          <button onClick={() => router.push("/chat")} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all">
            Назад к чатам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-[#020617] transition-colors duration-500 font-sans">

      {/* ── Context Menu ─────────────────────────────────────────────────── */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onMouseDown={(e) => { e.stopPropagation(); closeContextMenu(); }} />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden w-56 animate-in fade-in zoom-in-95 duration-150"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Reaction row */}
            <div className="flex items-center gap-1 px-2 py-2 border-b border-gray-100 dark:border-gray-700">
              {QUICK_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { toggleReaction(contextMenu.messageId, emoji); closeContextMenu(); }}
                  className="w-9 h-9 flex items-center justify-center text-xl rounded-full hover:scale-125 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <button
              onClick={() => { const msg = messages.find(m => m.id === contextMenu.messageId); if (msg) handleReply(msg); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <Reply size={16} className="text-indigo-500" />
              Ответить
            </button>

            <button
              onClick={() => { const msg = messages.find(m => m.id === contextMenu.messageId); if (msg) handleForward(msg); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <Forward size={16} className="text-indigo-500" />
              Переслать
            </button>
          </div>
        </>
      )}

      {/* ── Forward Sheet ─────────────────────────────────────────────────── */}
      {showForwardSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full sm:w-96 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-white text-base">Переслать сообщение</h2>
              <button onClick={() => { setShowForwardSheet(false); setForwardMessage(null); }} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <X size={18} />
              </button>
            </div>

            {forwardMessage && (
              <div className="mx-4 mt-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border-l-4 border-indigo-400">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Сообщение для пересылки</p>
                <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2">{forwardMessage.content}</p>
              </div>
            )}

            <div className="px-4 py-3 max-h-72 overflow-y-auto space-y-1">
              {conversations.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">Нет личных чатов</p>
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
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{conv.other_user_name || "Пользователь"}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all">
            <ArrowLeft size={22} />
          </button>

          <Link href="/chat" className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
                {group?.avatar_url ? (
                  <Image src={group.avatar_url} alt="group avatar" width={40} height={40} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400"><Users size={20} /></div>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">{group?.title || "Группа"}</h1>
              <p className="text-[11px] font-medium text-indigo-500 dark:text-indigo-400 truncate">Групповой чат</p>
            </div>
          </Link>
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><MoreHorizontal size={20} /></button>
      </header>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 space-y-1 scroll-smooth custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Send size={24} className="text-indigo-500" />
              </div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Пока нет сообщений</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Напиши первым, чтобы начать обсуждение в группе.</p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === user?.id;
            const sender = getProfileById(msg.sender_id);
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
                {/* Avatar for others */}
                {!isMe && (
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0 mr-2 mt-auto mb-1">
                    {sender?.avatar_url ? (
                      <Image src={sender.avatar_url} alt="avatar" width={28} height={28} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><User size={14} className="text-gray-400" /></div>
                    )}
                  </div>
                )}

                <div className={`relative max-w-[80%] md:max-w-[68%] flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Bubble */}
                  <div
                    onContextMenu={(e) => handleContextMenu(e, msg)}
                    onTouchStart={(e) => handleTouchStart(e, msg)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    className="cursor-pointer select-none"
                  >
                    {/* Forwarded */}
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
                      {/* Sender name (for others) */}
                      {!isMe && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-300 flex items-center gap-1">
                            {getDisplayName(sender)}
                            {sender?.is_verified && <ShieldCheck size={11} className="text-indigo-500" />}
                          </span>
                        </div>
                      )}

                      {/* Reply preview */}
                      {replyData && (
                        <button
                          onClick={() => scrollToMessage(replyData.id)}
                          className={`block w-full text-left mb-2 px-3 py-2 rounded-xl border-l-4 transition-opacity hover:opacity-80 ${
                            isMe ? "bg-indigo-700/50 border-white/60" : "bg-gray-50 dark:bg-gray-700/50 border-indigo-400"
                          }`}
                        >
                          <p className={`text-[10px] font-semibold mb-0.5 ${isMe ? "text-white/80" : "text-indigo-500"}`}>
                            {replyData.sender_id === user?.id ? "Вы" : getDisplayName(getProfileById(replyData.sender_id))}
                          </p>
                          <p className={`text-xs line-clamp-1 ${isMe ? "text-white/70" : "text-gray-500 dark:text-gray-400"}`}>
                            {replyData.content}
                          </p>
                        </button>
                      )}

                      <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap select-text">{msg.content}</p>

                      <div className={`flex items-center justify-end gap-1 mt-1 opacity-70 text-[10px] font-medium ${isMe ? "text-white" : "text-gray-400"}`}>
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </div>
                    </div>

                    {/* Reactions */}
                    {hasReactions && (
                      <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? "justify-end" : "justify-start"} px-1`}>
                        {msg.reactions?.map(reaction => (
                          <button
                            key={reaction.emoji}
                            onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, reaction.emoji); }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all active:scale-95 cursor-pointer ${
                              reaction.hasReacted
                                ? "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-sm"
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                          >
                            <span>{reaction.emoji}</span>
                            {reaction.count > 1 && <span className="font-semibold">{reaction.count}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick reply button */}
                  <button
                    onClick={() => handleReply(msg)}
                    className="shrink-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-sm"
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

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        {/* Reply bar */}
        {replyTo && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom-2 duration-200">
            <div className="w-0.5 min-h-[2.5rem] bg-indigo-500 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-500 mb-0.5">
                {getDisplayName(getProfileById(replyTo.sender_id))}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{replyTo.content}</p>
            </div>
            <button onClick={cancelReply} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-colors shrink-0">
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
              onChange={(e) => setInput(e.target.value)}
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
        .highlight-message { border-radius: 1rem; animation: highlight-pulse 1.4s ease; }
      `}</style>
    </div>
  );
}
