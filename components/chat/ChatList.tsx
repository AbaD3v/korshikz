"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import { Send } from "lucide-react";

/**
 * Props:
 * - currentUserId?: string  (если не передан — компонент попытается получить через supabase.auth.getUser())
 * - recipientId: string     (ID пользователя, с которым чат)
 */
export default function ChatWindow({
  currentUserId: propCurrentUserId,
  recipientId,
}: {
  currentUserId?: string | null;
  recipientId: string;
}) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    propCurrentUserId ?? null
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 1) Ensure we have currentUserId (fallback to supabase auth)
  useEffect(() => {
    if (propCurrentUserId) return; // уже передали извне
    let mounted = true;
    (async () => {
      const res = await supabase.auth.getUser();
      const id = res.data.user?.id ?? null;
      if (mounted) setCurrentUserId(id);
    })();
    return () => {
      mounted = false;
    };
  }, [propCurrentUserId]);

  // helper: scroll to bottom
  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }, 50);
  };

  // 2) getOrCreate conversation between currentUserId and recipientId
  useEffect(() => {
    if (!currentUserId || !recipientId) return;
    let mounted = true;

    const getOrCreate = async () => {
      try {
        // Try find existing conversation (both orders)
        const { data: existing, error: exErr } = await supabase
          .from("conversations")
          .select("*")
          .or(
            `and(user1_id.eq.${currentUserId},user2_id.eq.${recipientId}),and(user1_id.eq.${recipientId},user2_id.eq.${currentUserId})`
          )
          .maybeSingle();

        if (exErr) {
          // not fatal, but log
          console.error("conversation lookup error", exErr);
        }

        if (existing && mounted) {
          setConversationId(existing.id);
          return;
        }

        // create if not exists
        const { data: created, error: createErr } = await supabase
          .from("conversations")
          .insert({
            type: "direct",
            created_by: currentUserId,
            user1_id: currentUserId,
            user2_id: recipientId,
          })
          .select()
          .single();

        if (createErr) {
          console.error("create conversation error", createErr);
          return;
        }

        if (mounted) setConversationId(created.id);
      } catch (e) {
        console.error("getOrCreate conversation failed", e);
      }
    };

    getOrCreate();

    return () => {
      mounted = false;
    };
  }, [currentUserId, recipientId]);

  // 3) load messages for conversation and subscribe realtime
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let active = true;

    const loadMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("loadMessages error", error);
      } else if (active) {
        setMessages(data ?? []);
        scrollToBottom(false);
      }
      setLoading(false);
    };

    loadMessages();

    // subscribe to new messages in this conversation
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Append incoming message
          setMessages((prev) => {
            // avoid duplicate if same id already present
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          scrollToBottom();
        }
      )
      .subscribe((status) => {
        // optional: debug subscription status
        // console.log("channel subscribe status", status);
      });

    // cleanup (synchronous)
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // autoscroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // 4) send message (creates row and appends returned row to list)
const sendMessage = async () => {
  if (!input.trim()) return;

  if (!conversationId) {
    console.error("❌ Нет conversation_id — сообщение сохранить нельзя");
    return;
  }

  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: input,
        topic: "message",
        extension: "text",
        metadata: {},
        is_system: false
      }
    ])
    .select();

  if (error) {
    console.error("❌ Ошибка вставки:", error);
  } else {
    console.log("✔ Сообщение отправлено:", data);
  }

  setInput("");
};


  // Enter key handler
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3 bg-gray-50">
        <div className="relative">
          <div className="w-10 h-10 bg-gray-300 rounded-full" />
          {/* online indicator: optional, you can use useOnlineStatus hook earlier if you want */}
        </div>
        <div>
          <div className="font-semibold text-gray-900">User {recipientId}</div>
          <div className="text-sm text-gray-500">
            {currentUserId ? "Чат готов" : "Загрузка профиля..."}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-100">
        {loading && <div className="text-center text-gray-500">Загрузка...</div>}

        {!loading && messages.length === 0 && (
          <div className="text-center text-gray-500">Пока нет сообщений</div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] p-3 rounded-2xl text-sm shadow ${
              m.sender_id === currentUserId
                ? "ml-auto bg-blue-500 text-white"
                : "mr-auto bg-white text-gray-800"
            }`}
          >
            {m.body}
            <div className="text-[10px] mt-1 text-gray-300">
              {new Date(m.created_at).toLocaleTimeString?.() || ""}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-white flex items-center gap-3">
        <input
          className="flex-1 border rounded-xl px-4 py-2 outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Напишите сообщение..."
          onKeyDown={onInputKeyDown}
        />

        <button
          onClick={sendMessage}
          className="p-3 bg-blue-500 rounded-xl text-white shadow flex items-center"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
