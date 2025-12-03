import { useEffect, useRef, useState } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import { useRouter } from "next/router";

export default function ChatPage() {
  const router = useRouter();
  const { id: otherUserId } = router.query;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const bottomRef = useRef(null);

  const scrollDown = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!otherUserId) return;

    const load = async () => {
      const userData = await supabase.auth.getUser();
      const user = userData.data.user;
      if (!user) return;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (!error) {
        setMessages(data);
        setTimeout(scrollDown, 100);
      }
    };

    load();

    const channel = supabase
      .channel("chat-" + otherUserId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollDown();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [otherUserId]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

await supabase.from("messages").insert({
  conversation_id: "<id диалога>",
  sender_id: user.id,
  body: input.trim(),
  topic: "chat",
  extension: "text",
});


    setInput("");
    setTimeout(scrollDown, 100);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        padding: 20,
      }}
    >
      <div style={{ flexGrow: 1, overflowY: "auto", marginBottom: 10 }}>
        {messages.map((msg) => {
          const isMe = msg.sender_id !== otherUserId;

          return (
            <div
              key={msg.id}
              style={{
                textAlign: isMe ? "right" : "left",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "10px 15px",
                  borderRadius: 12,
                  background: isMe ? "#72b5ff" : "#e8e8e8",
                  color: isMe ? "#fff" : "#000",
                }}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          style={{
            flexGrow: 1,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ccc",
          }}
          value={input}
          placeholder="Написать сообщение..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: "10px 15px",
            borderRadius: 10,
            background: "#4CAF50",
            color: "white",
            border: "none",
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}