import { useEffect, useState, useRef } from "react";
import { supabase } from "@/hooks/utils/supabase/client";

export function useConversationMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load history
  useEffect(() => {
    if (!conversationId) return;

    const loadMessages = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      setMessages(data ?? []);
      setLoading(false);
    };

    loadMessages();
  }, [conversationId]);

  // Realtime messages + typing
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`chat:${conversationId}`);

    // New messages
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const msg = payload.new;

        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    );

    // Typing indicator
    channel.on(
      "broadcast",
      { event: "typing" },
      (payload) => {
        const sender = payload.payload.user_id;

        setTypingUser(sender);

        // Auto-hide after 2 seconds
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUser(null);
        }, 2000);
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Send message
  const sendMessage = async (text: string) => {
    if (!conversationId) return;
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      body: text,
    });
  };

  // Send "typing" event
  const sendTyping = async (userId: string) => {
    await supabase.channel(`chat:${conversationId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId },
    });
  };

  return { messages, loading, sendMessage, typingUser, sendTyping };
}
