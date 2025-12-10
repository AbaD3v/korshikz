// pages/chat/[id].js
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import { useRouter } from "next/router";

/**
 * Chat page — single file, production-friendly.
 * Assumptions:
 * - Таблица `conversations` с полями { id: uuid PK, user1_id, user2_id, type, created_at }
 * - Таблица `messages` с полями { id: uuid PK, conversation_id uuid FK, sender_id, receiver_id, body, metadata jsonb, created_at }
 *
 * Поведение:
 * - На входе /chat/<otherUserId>
 * - Ищем существующую беседу, или upsert новую в conversations (чтобы FK не падал)
 * - Загружаем сообщения (ORDER BY created_at)
 * - Подписываемся на INSERT и UPDATE для этой conversation
 * - Broadcast: typing и presence
 * - markRead() добавляет текущего user.id в metadata.read_by у непрочитанных сообщений
 */

const newUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function ChatPage() {
  const router = useRouter();
  const rawOtherUserId = router.query.id;
  const otherUserId = Array.isArray(rawOtherUserId) ? rawOtherUserId[0] : rawOtherUserId;

  const [user, setUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [otherUserName, setOtherUserName] = useState("");
  const [otherUserAvatar, setOtherUserAvatar] = useState(null);
  const [typingUser, setTypingUser] = useState(null); // userId who typing
  const [presence, setPresence] = useState({ online: false, lastSeen: null });

  const bottomRef = useRef(null);
  const typingDebounceRef = useRef(null);
  const presenceIntervalRef = useRef(null);

  const scrollDown = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // --- auth user
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (mounted) setUser(data?.user ?? null);
      } catch (e) {
        console.error("auth.getUser error", e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // --- load other user's profile (name, avatar)
  useEffect(() => {
    if (!otherUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", otherUserId)
          .single();
        if (!cancelled && !error && data) {
          setOtherUserName(data.full_name ?? `Пользователь ${otherUserId.slice(0,6)}`);
          setOtherUserAvatar(data.avatar_url ?? null);
        }
      } catch (e) {
        console.error("load other profile error", e);
      }
    })();
    return () => { cancelled = true; };
  }, [otherUserId]);

  // --- init conversation: try conversations table, then messages, otherwise create (upsert)
  useEffect(() => {
    if (!user || !otherUserId) return;
    let cancelled = false;

    (async () => {
      try {
        // try to find direct conversation where both participants present
        const { data: convCandidates } = await supabase
          .from("conversations")
          .select("id, user1_id, user2_id")
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .eq("type", "direct")
          .limit(200);

        // find exact match (order-agnostic)
        const found = (convCandidates ?? []).find((c) =>
          c && ((c.user1_id === user.id && c.user2_id === otherUserId) || (c.user2_id === user.id && c.user1_id === otherUserId))
        );

        if (found) {
          if (!cancelled) setConversationId(found.id);
          return;
        }

        // fallback: try to find by messages row
        const { data: msgData } = await supabase
          .from("messages")
          .select("conversation_id")
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
          )
          .limit(1);

        if (msgData && msgData.length > 0 && msgData[0]?.conversation_id) {
          if (!cancelled) setConversationId(msgData[0].conversation_id);
          return;
        }

        // nothing found: create new conversation row (upsert)
        const newConvId = newUUID();
        const upsert = {
          id: newConvId,
          user1_id: user.id,
          user2_id: otherUserId,
          type: "direct",
          created_at: new Date().toISOString(),
        };

        const { error: upsertErr } = await supabase.from("conversations").upsert(upsert, { onConflict: "id" });
        if (upsertErr) console.error("conversations upsert error", upsertErr);

        if (!cancelled) setConversationId(newConvId);
      } catch (e) {
        console.error("init conversation error", e);
        if (!cancelled) setConversationId(newUUID());
      }
    })();

    return () => { cancelled = true; };
  }, [user, otherUserId]);

  // --- load messages when conversation ready
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (!error && !cancelled) {
          setMessages(data ?? []);
          setTimeout(scrollDown, 80);

          // mark read for current user (on opening)
          if (user) {
            markReadInternal(conversationId, user.id).catch((e) => console.error("markReadInternal error", e));
            // refresh to see updated read_by
            const { data: fresh } = await supabase
              .from("messages")
              .select("*")
              .eq("conversation_id", conversationId)
              .order("created_at", { ascending: true });
            if (!cancelled) setMessages(fresh ?? []);
          }
        } else if (error) {
          console.error("load messages error", error);
        }
      } catch (e) {
        console.error("load messages exception", e);
      }
    })();

    return () => { cancelled = true; };
  }, [conversationId, user, scrollDown]);

  // --- realtime: subscribe to INSERT and UPDATE for messages; handle broadcast events typing/presence
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`chat:${conversationId}`);

    // INSERT handler
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        const msg = payload.new;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // if message received for me, auto mark read (simulate opening)
        if (user && msg.receiver_id === user.id) {
          // mark just-inserted messages as read by this user
          markReadInternal(conversationId, user.id).catch((e) => console.error("markRead on insert error", e));
        }

        setTimeout(scrollDown, 50);
      }
    );

    // UPDATE handler — update message (e.g., read_by changed)
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        const updated = payload.new;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
    );

    // typing broadcast
    channel.on(
      "broadcast",
      { event: "typing" },
      (payload) => {
        const uid = payload.payload?.user_id;
        if (uid && uid !== user?.id) {
          setTypingUser(uid);
          // clear after 2s
          if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
          typingDebounceRef.current = setTimeout(() => setTypingUser(null), 2000);
        }
      }
    );

    // presence broadcast
    channel.on(
      "broadcast",
      { event: "presence" },
      (payload) => {
        const { user_id, status, last_seen } = payload.payload || {};
        if (user_id && user_id === otherUserId) {
          setPresence({ online: status === "online", lastSeen: last_seen ?? null });
        }
      }
    );

    // subscribe (don't use .catch — subscribe returns subscription sync in v2)
    try {
      channel.subscribe();
    } catch (e) {
      console.error("channel.subscribe error", e);
    }

    return () => {
      // remove channel and clear timers
      supabase.removeChannel(channel);
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user, otherUserId, scrollDown]);

  // --- presence heartbeat: broadcast online every 30s; send offline on unload
  useEffect(() => {
    if (!conversationId || !user) return;
    const channel = supabase.channel(`chat:${conversationId}`);

    const broadcastPresence = async (status = "online") => {
      try {
        await channel.send({
          type: "broadcast",
          event: "presence",
          payload: { user_id: user.id, status, last_seen: new Date().toISOString() },
        });
      } catch (e) {
        // ignore
      }
    };

    // immediate online
    broadcastPresence("online");
    presenceIntervalRef.current = setInterval(() => broadcastPresence("online"), 30_000);

    const handleUnload = () => broadcastPresence("offline").catch(() => {});
    window.addEventListener("beforeunload", handleUnload);
    router.events?.on?.("routeChangeStart", handleUnload);

    return () => {
      clearInterval(presenceIntervalRef.current);
      window.removeEventListener("beforeunload", handleUnload);
      router.events?.off?.("routeChangeStart", handleUnload);
      broadcastPresence("offline").catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user]);

  // --- send typing (debounced throttle)
  const sendTyping = useCallback(() => {
    if (!conversationId || !user) return;
    const channel = supabase.channel(`chat:${conversationId}`);
    try {
      channel.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: user.id, at: new Date().toISOString() },
      });
    } catch {
      // ignore
    }
  }, [conversationId, user]);

  // --- internal: mark read by adding userId to metadata.read_by for all unread messages
  const markReadInternal = async (convId, readerId) => {
    if (!convId || !readerId) return;
    try {
      // fetch messages that do not contain readerId in metadata.read_by
      const { data } = await supabase
        .from("messages")
        .select("id, metadata")
        .eq("conversation_id", convId);

      if (!data || data.length === 0) return;

      // build updates for messages where read_by doesn't include readerId
      const updates = [];
      for (const m of data) {
        const readBy = (m.metadata && m.metadata.read_by) || [];
        if (!Array.isArray(readBy) || !readBy.includes(readerId)) {
          const newMeta = { ...(m.metadata || {}) , read_by: Array.isArray(readBy) ? [...readBy, readerId] : [readerId] };
          updates.push({ id: m.id, metadata: newMeta });
        }
      }

      // batch update (one-by-one to be safe)
      await Promise.all(
        updates.map((u) =>
          supabase.from("messages").update({ metadata: u.metadata }).eq("id", u.id)
        )
      );
    } catch (e) {
      console.error("markReadInternal error", e);
    }
  };

  // --- public markRead (manual button)
  const markRead = async () => {
    if (!conversationId || !user) return;
    await markReadInternal(conversationId, user.id);
    // refresh
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
  };

  // --- send message
  const sendMessage = async () => {
    if (!input.trim() || !user || !otherUserId || !conversationId) return;

    const payload = {
      id: newUUID(),
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: otherUserId,
      body: input.trim(),
      metadata: { read_by: [] },
      created_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from("messages").insert(payload);
      if (error) {
        console.error("send message error", error);
      } else {
        setInput("");
        setTimeout(scrollDown, 60);
      }
    } catch (e) {
      console.error("send message exception", e);
    }
  };

  // --- helpers: ticks display
  const isReadByReceiver = (msg) => {
    try {
      const arr = msg?.metadata?.read_by ?? [];
      return Array.isArray(arr) ? arr.includes(msg.receiver_id) : false;
    } catch {
      return false;
    }
  };

  const renderTicks = (msg) => {
    if (!user || msg.sender_id !== user.id) return null;
    const read = isReadByReceiver(msg);
    return (
      <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.85 }}>
        {read ? "✓✓" : "✓"}
      </span>
    );
  };

  const presenceText = () => {
    if (typingUser && typingUser === otherUserId) return "набирает…";
    if (presence.online) return "online";
    if (presence.lastSeen) {
      const d = new Date(presence.lastSeen);
      return `последний раз в сети ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return "";
  };

  // --- UI
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxHeight: "100dvh", padding: 0, fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}>
      {/* Header */}
      <div style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#ddd", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {otherUserAvatar ? (
            <img src={otherUserAvatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ fontSize: 14, color: "#555" }}>{otherUserName ? otherUserName[0] : "U"}</div>
          )}
        </div>
        <div style={{ flexGrow: 1 }}>
          <div style={{ fontWeight: 600 }}>{otherUserName || `Пользователь ${otherUserId?.slice?.(0,6) ?? ""}`}</div>
          <div style={{ fontSize: 12, color: "#666" }}>{presenceText()}</div>
        </div>
        <div>
          <button onClick={() => markRead()} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e2e2", background: "#fff", cursor: "pointer" }}>
            Пометить прочитанным
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flexGrow: 1, overflowY: "auto", padding: "12px 16px", background: "#f7f7f7" }}>
        {messages.map((msg) => {
          const isMe = user && msg.sender_id === user.id;
          return (
            <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <div style={{
                maxWidth: "78%",
                padding: "10px 14px",
                borderRadius: 14,
                background: isMe ? "#0b84ff" : "#fff",
                color: isMe ? "#fff" : "#111",
                boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
                wordBreak: "break-word",
                position: "relative"
              }}>
                <div>{msg.body}</div>
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: isMe ? "rgba(255,255,255,0.9)" : "#666" }}>
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                  </div>
                  {renderTicks(msg)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: 12, borderTop: "1px solid #eee", display: "flex", gap: 10, alignItems: "center", background: "#fff" }}>
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); sendTyping(); }}
          onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
          placeholder="Написать сообщение..."
          style={{ flexGrow: 1, padding: "10px 14px", borderRadius: 20, border: "1px solid #e6e6e6", outline: "none" }}
        />
        <button onClick={sendMessage} style={{ padding: "10px 14px", borderRadius: 12, background: "#0b84ff", color: "#fff", border: "none", cursor: "pointer" }}>
          ➤
        </button>
      </div>
    </div>
  );
}
