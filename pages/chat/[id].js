// pages/chat/[id].js
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import { useRouter } from "next/router";

export default function ChatPage() {
  const router = useRouter();
  const { id: otherUserId } = router.query;

  const [user, setUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const bottomRef = useRef(null);

  const scrollDown = () =>
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  // Load auth user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
  }, []);

  // Find or create conversation
  useEffect(() => {
    if (!user || !otherUserId) return;

    const loadConversation = async () => {
      // check if exists
      const { data } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`
        )
        .limit(1);

      if (data && data.length > 0) {
        setConversationId(data[0].id);
        return;
      }

      // create new conversation
      const { data: created, error } = await supabase
        .from("conversations")
        .insert([
          {
            user1_id: user.id,
            user2_id: otherUserId,
            created_by: user.id,
          },
        ])
        .select("id")
        .single();

      if (error) console.error("Create conversation error:", error);
      else setConversationId(created.id);
    };

    loadConversation();
  }, [user, otherUserId]);

  // Load messages
  useEffect(() => {
    if (!conversationId) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(data);
        scrollDown();
      }
    };

    loadMessages();
  }, [conversationId]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollDown();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [conversationId]);

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || !user || !conversationId) return;

    const { error } = await supabase.from("messages").insert([
      {
        conversation_id: conversationId,
        sender_id: user.id,
        receiver_id: otherUserId,
        body: input.trim(),
        is_system: false,
        metadata: {},
      },
    ]);

    if (error) console.error("Send message error:", error);
    else {
      setInput("");
      scrollDown();
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", padding: 20 }}>
      {/* Message list */}
      <div style={{ flexGrow: 1, overflowY: "auto" }}>
        {messages.map((msg) => {
          const mine = msg.sender_id === user?.id;
          return (
            <div
              key={msg.id}
              style={{
                textAlign: mine ? "right" : "left",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  background: mine ? "#4da3ff" : "#eee",
                  padding: "10px 15px",
                  borderRadius: 12,
                  color: mine ? "white" : "black",
                }}
              >
                {msg.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Сообщение..."
          style={{
            flexGrow: 1,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ccc",
          }}
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
