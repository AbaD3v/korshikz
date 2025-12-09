import { useEffect, useState } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import Link from "next/link";

export default function ChatList() {
  const [dialogs, setDialogs] = useState([]);

  useEffect(() => {
    const loadDialogs = async () => {
      const userData = await supabase.auth.getUser();
      const user = userData.data.user;
      if (!user) return;

      // Берём все сообщения, где участвовал текущий пользователь
      const { data, error } = await supabase
        .from("messages")
        .select("conversation_id, sender_id, receiver_id")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (!error && data) {
        // Составляем список уникальных бесед
        const conversationsMap = new Map();
        data.forEach((msg) => {
          conversationsMap.set(msg.conversation_id, {
            conversation_id: msg.conversation_id,
            other_user: msg.sender_id === user.id ? msg.receiver_id : msg.sender_id,
          });
        });

        setDialogs(Array.from(conversationsMap.values()));
      }
    };

    loadDialogs();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Диалоги</h2>
      {dialogs.length === 0 && <p>Нет сообщений</p>}

      {dialogs.map(({ conversation_id, other_user }) => (
        <Link key={conversation_id} href={`/chat/${conversation_id}?user=${other_user}`}>
          <div
            style={{
              padding: 15,
              background: "#f4f4f4",
              marginTop: 10,
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Чат с пользователем {other_user}
          </div>
        </Link>
      ))}
    </div>
  );
}
