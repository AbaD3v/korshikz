"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/hooks/utils/supabase/client";
import { ArrowLeft, Send, Users, MoreHorizontal } from "lucide-react";

export default function GroupChatPage() {
  const router = useRouter();
  const rawId = router.query.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [group, setGroup] = useState<any>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollDown = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Загрузка группы
  useEffect(() => {
    if (!id) return;

    supabase
      .from("group_chats")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => setGroup(data));
  }, [id]);

  // Загрузка сообщений
  useEffect(() => {
    if (!id) return;

    supabase
      .from("group_chat_messages")
      .select("*")
      .eq("group_chat_id", id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages(data || []);
        setTimeout(scrollDown, 100);
      });
  }, [id, scrollDown]);

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
  }, [id, scrollDown]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !id) return;

    const text = input.trim();
    setInput("");

    await supabase.from("group_chat_messages").insert({
      group_chat_id: id,
      sender_id: user.id,
      content: text,
    });
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#020617] text-white transition-colors duration-300 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#0b1120]/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-300 hover:bg-white/10 rounded-full transition-all"
          >
            <ArrowLeft size={22} />
          </button>

          <div className="w-10 h-10 rounded-2xl bg-[#1e293b] border border-white/10 flex items-center justify-center shadow-sm shrink-0">
            <Users size={18} className="text-gray-300" />
          </div>

          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white leading-tight truncate">
              {group?.title || "Группа"}
            </h1>
            <p className="text-[11px] font-medium text-indigo-400 truncate">
              Групповой чат
            </p>
          </div>
        </div>

        <button className="p-2 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-full transition-all">
          <MoreHorizontal size={20} />
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar bg-[#020617]">
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;

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
                    : "bg-[#1e293b] text-white rounded-[1.25rem] rounded-tl-none border border-white/10"
                }`}
              >
                {!isMe && (
                  <div className="text-[11px] font-semibold text-indigo-300 mb-1">
                    Участник
                  </div>
                )}

                <p className="text-[15px] leading-relaxed break-words select-text">
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
        })}

        <div ref={bottomRef} className="h-2" />
      </main>

      {/* Input */}
      <footer className="p-4 bg-[#0b1120] border-t border-white/10">
        <div className="max-w-4xl mx-auto flex items-end gap-2 bg-[#1e293b] p-1.5 rounded-[1.5rem] border border-white/10 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
          <textarea
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
            className="flex-1 max-h-32 bg-transparent border-none outline-none py-2.5 px-3 text-[15px] text-white placeholder:text-gray-400 resize-none"
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className={`p-3 rounded-2xl transition-all active:scale-95 ${
              input.trim()
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
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
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}