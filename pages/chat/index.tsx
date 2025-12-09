// pages/chat/index.js
import { useEffect, useState } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import Link from "next/link";

export default function ChatList() {
  const [dialogs, setDialogs] = useState([]);
  const [user, setUser] = useState(null);

  // Получаем текущего пользователя
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUser(data.user);
    };
    getUser();
  }, []);

  // Загружаем список диалогов
  useEffect(() => {
    if (!user) return;

    const loadDialogs = async () => {
      // Получаем все сообщения пользователя
      const { data, error } = await supabase
        .from("messages")
        .select("sender_id, receiver_id")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (error) {
        console.error("Ошибка загрузки сообщений:", error.message);
        return;
      }

      if (data) {
        // Создаём Set с уникальными пользователями
        const usersSet = new Set();

        data.forEach((msg) => {
          // Определяем другого пользователя в диалоге
          const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          usersSet.add(otherUserId);
        });

        setDialogs(Array.from(usersSet));
      }
    };

    loadDialogs();
  }, [user]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Диалоги</h2>
      {dialogs.length === 0 && <p>Нет сообщений</p>}

      {dialogs.map((otherUserId) => (
        <Link key={otherUserId} href={`/chat/${otherUserId}`}>
          <div
            style={{
              padding: 15,
              background: "#f4f4f4",
              marginTop: 10,
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Чат с пользователем {otherUserId}
          </div>
        </Link>
      ))}
    </div>
  );
}
