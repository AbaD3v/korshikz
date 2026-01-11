"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Send, Check, CheckCheck, User, MoreHorizontal } from "lucide-react";

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

  const [user, setUser] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [otherUserName, setOtherUserName] = useState("");
  const [otherUserAvatar, setOtherUserAvatar] = useState<string | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [presence, setPresence] = useState({ online: false, lastSeen: null });

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingDebounceRef = useRef<any>(null);
  const presenceIntervalRef = useRef<any>(null);

  const scrollDown = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // --- Auth & Profile Loading (Твоя логика сохранена) ---
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
  }, []);

  useEffect(() => {
    if (!otherUserId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", otherUserId)
        .single();
      if (data) {
        setOtherUserName(data.full_name ?? "Пользователь");
        setOtherUserAvatar(data.avatar_url ?? null);
      }
    })();
  }, [otherUserId]);

  // --- Conversation & Messages Logic (Твоя логика сохранена) ---
  useEffect(() => {
    if (!user || !otherUserId) return;
    (async () => {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, user1_id, user2_id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq("type", "direct");

      const found = conv?.find(c => 
        (c.user1_id === user.id && c.user2_id === otherUserId) || 
        (c.user2_id === user.id && c.user1_id === otherUserId)
      );

      if (found) setConversationId(found.id);
      else {
        const id = newUUID();
        await supabase.from("conversations").upsert({
          id, user1_id: user.id, user2_id: otherUserId, type: "direct"
        });
        setConversationId(id);
      }
    })();
  }, [user, otherUserId]);

  useEffect(() => {
    if (!conversationId) return;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages(data ?? []);
      setTimeout(scrollDown, 100);
    })();
  }, [conversationId, scrollDown]);

  // --- Realtime & Broadcast ---
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`chat:${conversationId}`);

    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, 
      (p) => {
        setMessages(prev => [...prev, p.new]);
        setTimeout(scrollDown, 50);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, 
      (p) => {
        setMessages(prev => prev.map(m => m.id === p.new.id ? p.new : m));
      })
      .on("broadcast", { event: "typing" }, (p) => {
        if (p.payload.user_id !== user?.id) {
          setTypingUser(p.payload.user_id);
          if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
          typingDebounceRef.current = setTimeout(() => setTypingUser(null), 3000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user, scrollDown]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !conversationId) return;
    const text = input.trim();
    setInput("");
    
    await supabase.from("messages").insert({
      id: newUUID(),
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: otherUserId,
      body: text,
      metadata: { read_by: [] }
    });
  };

  const sendTyping = () => {
    supabase.channel(`chat:${conversationId}`).send({
      type: "broadcast", event: "typing", payload: { user_id: user.id }
    });
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-[#020617] transition-colors duration-500 font-sans">
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all">
            <ArrowLeft size={22} />
          </button>
          
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
              {otherUserAvatar ? (
                <Image src={otherUserAvatar} alt="avatar" width={40} height={40} className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={20} /></div>
              )}
            </div>
            {presence.online && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />}
          </div>

          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              {otherUserName}
            </h1>
            <p className="text-[11px] font-medium text-indigo-500 dark:text-indigo-400">
              {typingUser ? "набирает сообщение..." : (presence.online ? "В сети" : "Был недавно")}
            </p>
          </div>
        </div>
        
        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <MoreHorizontal size={20} />
        </button>
      </header>

      {/* Chat Messages Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar">
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === user?.id;
          const isRead = msg.metadata?.read_by?.includes(msg.receiver_id);

          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
              <div className={`relative max-w-[85%] md:max-w-[70%] px-4 py-2.5 shadow-sm 
                ${isMe 
                  ? "bg-indigo-600 text-white rounded-[1.25rem] rounded-tr-none" 
                  : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-[1.25rem] rounded-tl-none border border-gray-100 dark:border-gray-700/50"
                }`}
              >
                <p className="text-[15px] leading-relaxed select-text">{msg.body}</p>
                
                <div className={`flex items-center justify-end gap-1 mt-1 opacity-70 text-[10px] font-medium ${isMe ? "text-white" : "text-gray-400"}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMe && (
                    isRead ? <CheckCheck size={12} className="text-white" /> : <Check size={12} className="text-white/80" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-2" />
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto flex items-end gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              sendTyping();
            }}
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
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
}