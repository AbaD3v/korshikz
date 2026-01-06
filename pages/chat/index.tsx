"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router"; // если у тебя Next.js 13+, лучше import { useRouter } from "next/navigation"
import { supabase } from "@/hooks/utils/supabase/client";
import { ChevronRight } from "lucide-react";

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
  const router = useRouter();

  // Получаем текущего юзера
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user ?? null;
      setUser(u);

      // 👉 если нет авторизации — редиректим на страницу входа
      if (!u) {
        router.push("/auth/login");
      }
    });
  }, [router]);

  // Загружаем диалоги
  useEffect(() => {
    if (!user) return;

    const loadDialogs = async () => {
      setLoading(true);

      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!messages) return setLoading(false);

      const map = new Map<string, any>();
      for (const msg of messages) {
        const otherId =
          msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
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
        const unreadCount =
          unreadMessages?.filter((m) => m.sender_id === uid).length ?? 0;

        return {
          user:
            prof ?? {
              id: uid,
              full_name: "Неизвестно",
              avatar_url: null,
            },
          lastMessage: map.get(uid).lastMessage,
          lastTime: map.get(uid).lastTime,
          unread: unreadCount,
        };
      });

      setDialogs(result);
      setLoading(false);
    };

    loadDialogs();
  }, [user]);

  // 👉 fallback: если user ещё не загрузился
  if (!user) {
    return (
      <div className="p-6 font-sans">
        <h2 className="text-2xl mb-4 font-semibold text-gray-900 dark:text-white">
          Чаты
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Нужно войти в аккаунт, чтобы просматривать чаты
        </p>
        <Link
          href="/auth/login"
          className="mt-4 inline-block px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          Войти
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 font-sans">
      <h2 className="text-2xl mb-4 font-semibold text-gray-900 dark:text-white">
        Чаты
      </h2>

      {loading && <p className="text-gray-500 dark:text-gray-400">Загрузка…</p>}
      {!loading && dialogs.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">Нет диалогов</p>
      )}

      <div className="flex flex-col gap-3">
        {dialogs.map(({ user: u, lastMessage, lastTime, unread }) => (
          <Link
            key={u.id}
            href={`/chat/${u.id}`}
            className="flex items-center gap-3 p-3 
                       hover:bg-blue-300 dark:hover:bg-gray-800 
                       rounded-xl transition-all duration-200 
                       cursor-pointer group active:scale-[0.98]"
          >
            {/* ... твой аватар и контент */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">
                {u.full_name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {lastMessage ?? "Нет сообщений"}
              </p>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 min-w-[55px] text-right">
              {lastTime
                ? new Date(lastTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </div>
            <ChevronRight
              size={20}
              className="text-gray-400 group-hover:text-indigo-500 transition"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
