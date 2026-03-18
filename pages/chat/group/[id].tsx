"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/hooks/utils/supabase/client";
import { ArrowLeft, Send } from "lucide-react";

export default function GroupChatPage() {
  const router = useRouter();
  const { id } = router.query;

  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [group, setGroup] = useState<any>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // загрузка группы
  useEffect(() => {
    if (!id) return;

    supabase
      .from("group_chats")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => setGroup(data));
  }, [id]);

  // загрузка сообщений
  useEffect(() => {
    if (!id) return;

    supabase
      .from("group_chat_messages")
      .select("*")
      .eq("group_chat_id", id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages(data || []);
        setTimeout(() => scrollDown(), 100);
      });
  }, [id]);

  const scrollDown = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // realtime
  useEffect(() => {
    if (!id) return;

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
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          setTimeout(scrollDown, 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;

    await supabase.from("group_chat_messages").insert({
      group_chat_id: id,
      sender_id: user.id,
      content: input,
    });

    setInput("");
  };

  return (
    <div className="flex flex-col h-screen">

      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <button onClick={() => router.back()}>
          <ArrowLeft />
        </button>
        <h1 className="font-bold">{group?.title || "Группа"}</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[70%] px-3 py-2 rounded-xl ${
              msg.sender_id === user?.id
                ? "ml-auto bg-indigo-600 text-white"
                : "bg-gray-200"
            }`}
          >
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
        />
        <button onClick={sendMessage}>
          <Send />
        </button>
      </div>
    </div>
  );
}