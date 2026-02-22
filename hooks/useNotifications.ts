import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/hooks/utils/supabase/client";
import { authedFetch } from "@/lib/authedFetch";
import { toast } from "sonner";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export function useNotifications(limit = 20) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.is_read).length,
    [items]
  );

  async function load() {
    setLoading(true);
    try {
      const r = await authedFetch(`/api/notifications/list?limit=${limit}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load notifications");
      setItems(j.items || []);
    } catch (e: any) {
      console.log("[useNotifications] load error:", e?.message);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    // оптимистично
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));

    const r = await authedFetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!r.ok) {
      // откат, если хочешь — можно, но чаще не нужно
      console.log("[useNotifications] markRead failed");
    }
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));

    const r = await authedFetch("/api/notifications/mark-all-read", { method: "POST" });
    if (!r.ok) console.log("[useNotifications] markAllRead failed");
  }

  useEffect(() => {
    let channel: any;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;

      await load();

      channel = supabase
        .channel("notifications-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as NotificationItem;

            // добавить в начало
            setItems((prev) => [row, ...prev].slice(0, limit));

            // тост (по желанию)
            toast(row.title || "Новое уведомление");
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return { items, unreadCount, loading, load, markRead, markAllRead };
}