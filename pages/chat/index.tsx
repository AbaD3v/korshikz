"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/hooks/utils/supabase/client";
import { ChevronRight, MessageSquare, Search, User } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface DialogItem {
  user: Profile;
  lastMessage: string | null;
  lastTime: string | null;
  unread: number;
}

export default function ChatList() {
  const [user, setUser] = useState<any>(null);
  const [dialogs, setDialogs] = useState<DialogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user ?? null;
      setUser(u);
      if (!u) router.push("/auth/login");
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const loadDialogs = async () => {
      setLoading(true);
      try {
        const { data: messages } = await supabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: false });

        if (!messages || messages.length === 0) {
          setLoading(false);
          return;
        }

        const map = new Map<string, any>();
        for (const msg of messages) {
          const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          if (!map.has(otherId)) {
            map.set(otherId, {
              otherUserId: otherId,
              lastMessage: msg.body,
              lastTime: msg.created_at,
            });
          }
        }

        const ids = Array.from(map.keys());
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", ids);

        const { data: unreadMessages } = await supabase
          .from("messages")
          .select("sender_id, receiver_id, read")
          .eq("receiver_id", user.id)
          .eq("read", false);

        const result: DialogItem[] = ids.map((uid) => {
          const prof = profiles?.find((p) => p.id === uid);
          const unreadCount = unreadMessages?.filter((m) => m.sender_id === uid).length ?? 0;

          return {
            user: prof ?? { id: uid, full_name: "Пользователь", avatar_url: null },
            lastMessage: map.get(uid).lastMessage,
            lastTime: map.get(uid).lastTime,
            unread: unreadCount,
          };
        });

        setDialogs(result);
      } catch (error) {
        console.error("Error loading dialogs:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDialogs();
  }, [user]);

  // Фильтрация по поиску
  const filteredDialogs = dialogs.filter((d) =>
    d.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    return isToday
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString([], { day: "numeric", month: "short" });
  };

  if (!user && !loading) return null;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 min-h-screen bg-gray-50 dark:bg-[#020617] transition-colors duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Сообщения
        </h2>
        <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 rounded-full">
          <MessageSquare className="text-indigo-600 dark:text-indigo-400" size={20} />
        </div>
      </div>

      {/* Поиск */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Поиск чатов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white transition-all shadow-sm"
        />
      </div>

      <div className="space-y-2">
        {loading ? (
          // Skeleton Loader
          [1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white/50 dark:bg-gray-900/50 rounded-2xl animate-pulse">
              <div className="w-14 h-14 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : filteredDialogs.length > 0 ? (
          filteredDialogs.map(({ user: u, lastMessage, lastTime, unread }) => (
            <Link
              key={u.id}
              href={`/chat/${u.id}`}
              className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 rounded-[1.5rem] transition-all duration-300 group active:scale-[0.98] shadow-sm"
            >
              {/* Аватар */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-50 dark:border-gray-700">
                  {u.avatar_url ? (
                    <Image src={u.avatar_url} alt="avatar" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <User size={24} />
                    </div>
                  )}
                </div>
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900 animate-in zoom-in">
                    {unread}
                  </span>
                )}
              </div>

              {/* Контент */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <p className="font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {u.full_name}
                  </p>
                  <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase">
                    {lastTime ? formatTime(lastTime) : ""}
                  </span>
                </div>
                <p className={`text-sm truncate ${unread > 0 ? 'text-gray-900 dark:text-gray-200 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                  {lastMessage ?? "Нет сообщений"}
                </p>
              </div>

              <ChevronRight
                size={18}
                className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all"
              />
            </Link>
          ))
        ) : (
          // Empty State
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-800">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={32} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Чатов не найдено</h3>
            <p className="text-gray-500 text-sm mt-1 max-w-[200px] mx-auto">
              Начните общение, найдя соседа в разделе объявлений
            </p>
            <Link href="/listings" className="mt-6 inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold hover:bg-indigo-700 transition-all">
              Найти соседа
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}