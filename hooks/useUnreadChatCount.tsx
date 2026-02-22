import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useUnreadChatCount() {
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  async function refreshUnreadChatCount() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setUnreadChatCount(0);
      return;
    }

    const { data, error } = await supabase.rpc("korshi_get_unread_chat_count");
    if (error) {
      console.log("[useUnreadChatCount] rpc error:", error.message);
      return;
    }

    setUnreadChatCount(Number(data ?? 0));
  }

  useEffect(() => {
    let channel: any;
    let mounted = true;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return;

      await refreshUnreadChatCount();

      // Realtime:
      // - новые сообщения -> пересчитать
      // - отметка last_read_at -> пересчитать
      channel = supabase
        .channel("korshi-unread-chat-count")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "korshi_messages" },
          async () => {
            if (!mounted) return;
            await refreshUnreadChatCount();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "korshi_chat_members",
            filter: `user_id=eq.${userId}`,
          },
          async () => {
            if (!mounted) return;
            await refreshUnreadChatCount();
          }
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { unreadChatCount, refreshUnreadChatCount };
}