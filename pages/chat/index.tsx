import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/hooks/utils/supabase/client";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface DialogItem {
  user: Profile;
  lastMessage: string | null;
  lastTime: string | null;
}

export default function ChatList() {
  const [user, setUser] = useState<any>(null);
  const [dialogs, setDialogs] = useState<DialogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Получаем текущего юзера
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });
  }, []);

  // Загружаем диалоги
  useEffect(() => {
    if (!user) return;

    const loadDialogs = async () => {
      setLoading(true);

      /** 1) Берём последние сообщения по каждой беседе */
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!messages) return setLoading(false);

      /** 2) Собираем уникальных собеседников */
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

      /** 3) Загружаем данные профилей */
      const ids = Array.from(map.keys());

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);

      /** 4) Создаём список */
      const result: DialogItem[] = ids.map((uid) => {
        const prof = profiles?.find((p) => p.id === uid);

        return {
          user: prof ?? { id: uid, full_name: "Неизвестно", avatar_url: null },
          lastMessage: map.get(uid).lastMessage,
          lastTime: map.get(uid).lastTime,
        };
      });

      setDialogs(result);
      setLoading(false);
    };

    loadDialogs();
  }, [user]);

  return (
    <div style={{ padding: 20, fontFamily: "Inter, sans-serif" }}>
      <h2 style={{ fontSize: 24, marginBottom: 20 }}>Чаты</h2>

      {loading && <p>Загрузка…</p>}
      {!loading && dialogs.length === 0 && <p>Нет диалогов</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {dialogs.map(({ user, lastMessage, lastTime }) => (
          <Link
            key={user.id}
            href={`/chat/${user.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: 12,
              borderRadius: 12,
              background: "#f8f8f8",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            {/* Аватар */}
            <img
              src={
                user.avatar_url ||
                "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.full_name || "User")
              }
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />

            {/* Имя + последнее сообщение */}
            <div style={{ flexGrow: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {user.full_name || "Пользователь"}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#777",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  maxWidth: "240px",
                }}
              >
                {lastMessage}
              </div>
            </div>

            {/* Время */}
            <div
              style={{
                fontSize: 12,
                color: "#999",
                minWidth: 50,
                textAlign: "right",
              }}
            >
              {lastTime
                ? new Date(lastTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
