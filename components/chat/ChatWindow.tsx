"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import { Send } from "lucide-react";

type Props = {
  currentUserId?: string | null;
  recipientId: string;
};

export default function ChatWindow({
  currentUserId: propCurrentUserId,
  recipientId,
}: Props) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    propCurrentUserId ?? null
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Получить текущего пользователя (если не передан сверху)
  useEffect(() => {
    if (propCurrentUserId) return;

    (async () => {
      const res = await supabase.auth.getUser();
      setCurrentUserId(res.data.user?.id ?? null);
    })();
  }, [propCurrentUserId]);

  // Автоскролл
  const scrollToBottom = () => {
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      60
    );
  };

  // 🎯 Создать или найти conversation
  const getOrCreateConversation = async (
    userA: string,
    userB: string
  ): Promise<string> => {
    // 1 — ищем существующий
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .or(
        `and(user1_id.eq.${userA},user2_id.eq.${userB}),and(user1_id.eq.${userB},user2_id.eq.${userA})`
      )
      .maybeSingle();

    if (existing) return existing.id;

    // 2 — создаём новый
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        type: "direct",
        created_by: userA,
        user1_id: userA,
        user2_id: userB,
      })
      .select()
      .single();

    if (error) throw error;

    return created.id;
  };

  // Загрузка диалога
  useEffect(() => {
    if (!currentUserId || !recipientId) return;

    (async () => {
      const id = await getOrCreateConversation(
        currentUserId,
        recipientId
      );
      setConversationId(id);
    })();
  }, [currentUserId, recipientId]);

  // Загрузка сообщений + realtime
// Загрузка сообщений + realtime
useEffect(() => {
  if (!conversationId) return;

  // ---- Загрузка истории (async внутри, но НЕ возвращаем её) ----
  const loadMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    setMessages(data ?? []);
    scrollToBottom();
  };

  loadMessages();

  // ---- Realtime подписка ----
  const channel = supabase
    .channel(`conv-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        scrollToBottom();
      }
    )
    .subscribe();

  // ---- Возвращаем ТОЛЬКО синхронный cleanup ----
  return () => {
    supabase.removeChannel(channel);
  };
}, [conversationId]);


  // Отправка сообщения
  const sendMessage = async () => {
    if (!input.trim() || !currentUserId || !conversationId) return;

    const message = {
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: input.trim(),
      topic: "chat",
      extension: "text",
      metadata: {},
      is_system: false,
    };

    const { data, error } = await supabase
      .from("messages")
      .insert(message)
      .select()
      .single();

    if (error) {
      console.error("SEND ERROR:", error);
      return;
    }

    // оптимистичное обновление
    setMessages((prev) => [...prev, data]);
    setInput("");
    scrollToBottom();
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* HEADER */}
      <div className="p-4 border-b bg-gray-50 text-gray-900 font-semibold">
        Чат с пользователем {recipientId}
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-100">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[70%] p-3 rounded-2xl text-sm shadow ${
              m.sender_id === currentUserId
                ? "ml-auto bg-blue-500 text-white"
                : "mr-auto bg-white text-gray-800"
            }`}
          >
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="p-3 border-t bg-white flex items-center gap-3">
        <input
          className="flex-1 border rounded-xl px-4 py-2 outline-none"
          placeholder="Напишите сообщение..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
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
