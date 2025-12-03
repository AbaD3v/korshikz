"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/hooks/utils/supabase/client";

export function useOnlineStatus(currentUserId: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase.channel("online-users", {
      config: {
        presence: {
          key: currentUserId,    // идентификатор текущего пользователя
          enabled: true,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();

        Object.values(state).forEach((sessions: any) => {
          sessions.forEach((s: any) => {
            if (s.key) online.add(s.key);
          });
        });

        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ key: currentUserId });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [currentUserId]);

  return { onlineUsers };
}
