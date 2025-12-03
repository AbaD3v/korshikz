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

      const { data, error } = await supabase
        .from("messages")
        .select("sender_id, receiver_id")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (!error && data) {
        const users = [];
        data.forEach((msg) => {
          const other =
            msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          if (!users.includes(other)) users.push(other);
        });
        setDialogs(users);
      }
    };

    loadDialogs();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Диалоги</h2>
      {dialogs.length === 0 && <p>Нет сообщений</p>}

      {dialogs.map((id) => (
        <Link key={id} href={`/chat/${id}`}>
          <div
            style={{
              padding: 15,
              background: "#f4f4f4",
              marginTop: 10,
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Чат с пользователем {id}
          </div>
        </Link>
      ))}
    </div>
  );
}
