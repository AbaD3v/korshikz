"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import { useRouter } from "next/router";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const newUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at?: string;
  metadata?: any;
  is_system?: boolean;
  delivered?: boolean;
  is_read?: boolean;
};

export default function ChatPage() {
  const router = useRouter();
  const otherUserIdRaw = router.query.user;
  const otherUserId =
    typeof otherUserIdRaw === "string" ? otherUserIdRaw : null;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollDown = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Получаем текущего пользователя
  useEffect(() => {
    const initUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setCurrentUser(user);
    };

    initUser();
  }, [router]);

  // 2. Находим или создаем conversationId и загружаем сообщения
  useEffect(() => {
    if (!currentUser?.id || !otherUserId) return;

    if (currentUser.id === otherUserId) {
      setError("Нельзя открыть чат с самим собой.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const initConversation = async () => {
      setLoading(true);
      setError("");

      try {
        // Пытаемся найти conversation_id по существующим сообщениям
        const { data: existingMessages, error } = await supabase
          .from("messages")
          .select("conversation_id")
          .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`
          )
          .limit(1);

        if (error) throw error;

        let convId: string;

        if (existingMessages && existingMessages.length > 0) {
          convId = existingMessages[0].conversation_id;
        } else {
          convId = newUUID();
        }

        if (cancelled) return;

        setConversationId(convId);

        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true });

        if (messagesError) throw messagesError;

        if (!cancelled) {
          setMessages(messagesData || []);
          setTimeout(scrollDown, 100);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Ошибка инициализации чата:", err);
          setError(err.message || "Не удалось загрузить чат");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initConversation();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, otherUserId]);

  // 3. Подписка на новые сообщения только когда уже есть conversationId
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;

          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });

          setTimeout(scrollDown, 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = async () => {
    if (!input.trim() || !currentUser || !otherUserId || !conversationId) return;

    setSending(true);
    setError("");

    const trimmed = input.trim();

    const messagePayload: Message = {
      id: newUUID(),
      conversation_id: conversationId,
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      body: trimmed,
      metadata: {},
      is_system: false,
      delivered: false,
      is_read: false,
    };

    try {
      const { error } = await supabase.from("messages").insert(messagePayload);
      if (error) throw error;

      setInput("");

      // optimistic update можно не делать, потому что realtime сам добавит сообщение
      // но если хочешь мгновенный UX, можно раскомментировать:
      // setMessages((prev) => [...prev, messagePayload]);
      // setTimeout(scrollDown, 50);
    } catch (err: any) {
      console.error("sendMessage insert error", err);
      setError(err.message || "Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-[#020617]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#020617] bg-white flex flex-col">
      <div className="max-w-3xl w-full mx-auto flex flex-col h-screen px-4 py-4">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
          <h1 className="text-xl font-black dark:text-white">Чат</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {otherUserId ? `Диалог с пользователем ${otherUserId}` : "Загрузка..."}
          </p>
        </div>

        {error && (
          <div className="mb-3 rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300 px-4 py-3 text-sm font-bold">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Сообщений пока нет. Напиши первым.
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUser?.id;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm ${
                      isMe
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                    }`}
                  >
                    {msg.body}
                  </div>
                </div>
              );
            })
          )}

          <div ref={bottomRef} />
        </div>

        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
          <input
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white outline-none"
            value={input}
            placeholder="Написать сообщение..."
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !sending) {
                sendMessage();
              }
            }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="px-5 py-3 rounded-2xl bg-indigo-600 text-white font-black disabled:opacity-50"
          >
            {sending ? "..." : "➤"}
          </button>
        </div>
      </div>
    </div>
  );
}