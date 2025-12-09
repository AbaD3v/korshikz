import { useEffect, useRef, useState } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import { useRouter } from "next/router";
import { v4 as uuidv4 } from "uuid";

export default function ChatPage() {
  const router = useRouter();
  const { user: otherUserId } = router.query;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const bottomRef = useRef(null);

  const scrollDown = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!otherUserId) return;

    const init = async () => {
      const userData = await supabase.auth.getUser();
      const user = userData.data.user;
      if (!user) return;

      // Проверяем, существует ли беседа между этими двумя пользователями
      const { data: existingMessages, error } = await supabase
        .from("messages")
        .select("conversation_id")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .limit(1);

      let convId;

      if (existingMessages && existingMessages.length > 0) {
        convId = existingMessages[0].conversation_id;
      } else {
        // Если нет, создаём новый conversation_id
        convId = uuidv4();
      }

      setConversationId(convId);

      // Загружаем все сообщения этой беседы
      const { data: messagesData } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (messagesData) {
        setMessages(messagesData);
        setTimeout(scrollDown, 100);
      }
    };

    init();

    // Подписка на новые сообщения по conversation_id
    const channel = supabase
      .channel(`chat-${conversationId || "temp"}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          if (payload.new.conversation_id === conversationId) {
            setMessages((prev) => [...prev, payload.new]);
            scrollDown();
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [otherUserId, conversationId]);

  const sendMessage = async () => {
    if (!input.trim() || !conversationId) return;

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;
    if (!user) return;

    // Вставляем сообщение с новым conversation_id, если нужно
    await supabase.from("messages").insert({
      id: uuidv4(),
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: otherUserId,
      body: input.trim(),
      created_at: new Date().toISOString(),
    });

    setInput("");
    setTimeout(scrollDown, 100);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", padding: 20 }}>
      <div style={{ flexGrow: 1, overflowY: "auto", marginBottom: 10 }}>
        {messages.map((msg) => {
          const isMe = msg.sender_id === userData?.data?.user?.id;
          return (
            <div key={msg.id} style={{ textAlign: isMe ? "right" : "left", marginBottom: 8 }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "10px 15px",
                  borderRadius: 12,
                  background: isMe ? "#72b5ff" : "#e8e8e8",
                  color: isMe ? "#fff" : "#000",
                }}
              >
                {msg.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          style={{ flexGrow: 1, padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
          value={input}
          placeholder="Написать сообщение..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          style={{ padding: "10px 15px", borderRadius: 10, background: "#4CAF50", color: "white", border: "none" }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
