import { useEffect, useState, useRef } from "react";
import { supabase } from "@/hooks/utils/supabase/client";

export function useConversationMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const userIdRef = useRef<string | null>(null);

  // get current user id
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) userIdRef.current = data.user.id;
      } catch (e) {
        console.error("getUser error", e);
      }
    })();
  }, []);

  // Load history
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;

    const loadMessages = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      setMessages(data ?? []);
      setLoading(false);

      // mark as read any incoming unread messages for current user
      try {
        const myId = userIdRef.current;
        if (myId && data && data.length) {
          const toMark = data
            .filter((m) => m.receiver_id === myId && !m.is_read)
            .map((m) => m.id);

          if (toMark.length) {
            await supabase
              .from("messages")
              .update({ is_read: true, read_at: new Date().toISOString() })
              .in("id", toMark);
            // The UPDATE will come through realtime subscription and update local state.
          }
        }
      } catch (e) {
        console.error("mark as read error", e);
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Realtime subscription: INSERT + UPDATE + broadcast(typing)
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`chat:${conversationId}`);

    // INSERT
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const msg = payload.new;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // If this client is the receiver -> acknowledge delivery
        const myId = userIdRef.current;
        if (myId && msg.receiver_id === myId) {
          // mark delivered = true (sender will see this update)
          try {
            await supabase.from("messages").update({ delivered: true }).eq("id", msg.id);
          } catch (e) {
            console.error("ack delivery error", e);
          }
        }
      }
    );

    // UPDATE (keep local state in sync for delivered/is_read changes)
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const updated = payload.new;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
    );

    // Typing broadcast
    channel.on(
      "broadcast",
      { event: "typing" },
      (payload) => {
        const sender = payload.payload.user_id;
        setTypingUser(sender);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUser(null);
        }, 2000);
      }
    );

    channel.subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.error("removeChannel error", e);
      }
    };
  }, [conversationId]);

  // Send message (exported) - ensure calling code sets other fields (sender/receiver)
  const sendMessage = async (messagePayload: { conversation_id: string; body: string; receiver_id: string; sender_id: string }) => {
    if (!conversationId) return;

    const newMessage = {
      ...messagePayload,
      delivered: false, // initially false
      is_read: false,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("messages").insert(newMessage);
    if (error) console.error("sendMessage insert error", error);
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
