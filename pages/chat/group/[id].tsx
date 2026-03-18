"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/hooks/utils/supabase/client";
import { ArrowLeft, Send, Users, MoreHorizontal, User } from "lucide-react";

interface Profile {
  id: string;
  email: string | null;
  avatar_url: string | null;
}

interface GroupMessage {
  id: string;
  group_chat_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
}

interface GroupChat {
  id: string;
  title: string | null;
  avatar_url?: string | null;
}

export default function GroupChatPage() {
  const router = useRouter();
  const rawId = router.query.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState("");
  const [group, setGroup] = useState<GroupChat | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollDown = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (!id) return;

    supabase
      .from("group_chats")
      .select("id, title, avatar_url")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Ошибка загрузки группы:", error);
          return;
        }
        setGroup((data as GroupChat) ?? null);
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;

    supabase
      .from("group_chat_messages")
      .select("id, group_chat_id, sender_id, content, created_at")
      .eq("group_chat_id", id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Ошибка загрузки сообщений:", error);
          return;
        }

        const msgs = (data as GroupMessage[]) || [];
        setMessages(msgs);
        setTimeout(scrollDown, 100);
      });
  }, [id, scrollDown]);

  useEffect(() => {
    if (!messages.length) {
      setProfiles([]);
      return;
    }

    const senderIds = Array.from(
      new Set(messages.map((m) => m.sender_id).filter(Boolean))
    );

    if (senderIds.length === 0) return;

    supabase
      .from("profiles")
      .select("id, email, avatar_url")
      .in("id", senderIds)
      .then(({ data, error }) => {
        if (error) {
          console.error("Ошибка загрузки профилей:", error);
          return;
        }

        setProfiles((data as Profile[]) || []);
      });
  }, [messages]);

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
          const newMessage = payload.new as GroupMessage;
          setMessages((prev) => [...prev, newMessage]);
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

    const { error } = await supabase.from("group_chat_messages").insert({
      group_chat_id: id,
      sender_id: user.id,
      content: text,
    });

    if (error) {
      console.error("Ошибка отправки сообщения:", error);
    }
  };

  const getProfileById = (userId: string) => {
    return profiles.find((p) => p.id === userId) ?? null;
  };

  const getDisplayName = (sender: Profile | null) => {
    return sender?.email?.split("@")[0] || "Пользователь";
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-[#020617] transition-colors duration-500 font-sans">
      <header className="flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
          >
            <ArrowLeft size={22} />
          </button>

          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
              {group?.avatar_url ? (
                <Image
                  src={group.avatar_url}
                  alt="group avatar"
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Users size={20} />
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
              {group?.title || "Группа"}
            </h1>
            <p className="text-[11px] font-medium text-indigo-500 dark:text-indigo-400 truncate">
              Групповой чат
            </p>
          </div>
        </div>

        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <MoreHorizontal size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar">
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          const sender = getProfileById(msg.sender_id);

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1 duration-300`}
            >
              <div
                className={`relative max-w-[85%] md:max-w-[70%] px-4 py-2.5 shadow-sm ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-[1.25rem] rounded-tr-none"
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-[1.25rem] rounded-tl-none border border-gray-100 dark:border-gray-700/50"
                }`}
              >
                {!isMe && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      {sender?.avatar_url ? (
                        <Image
                          src={sender.avatar_url}
                          alt="sender avatar"
                          width={20}
                          height={20}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <User size={12} className="text-gray-400" />
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-300">
                      {getDisplayName(sender)}
                    </span>
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

      <footer className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto flex items-end gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
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
            className="flex-1 max-h-32 bg-transparent border-none outline-none py-2.5 px-3 text-[15px] text-gray-900 dark:text-white placeholder:text-gray-400 resize-none"
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className={`p-3 rounded-2xl transition-all active:scale-95 ${
              input.trim()
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