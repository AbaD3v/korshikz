// pages/chat/index.js
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/hooks/utils/supabase/client";

/**
 * Улучшённый ChatList
 * - Показывает список бесед (conversation_id)
 * - Показывает имя и аватар другого пользователя (берётся из profiles)
 * - Показывает превью последнего сообщения и время
 * - Показывает количество непрочитанных сообщений (по metadata.read_by)
 * - Кнопка "Новый чат"
 *
 * NOTE: ссылки ведут в /chat/<conversation_id>?user=<other_user_id>
 */

export default function ChatList() {
  const [dialogs, setDialogs] = useState([]); // [{ conversation_id, other_user, lastMessage, lastAt, unread }]
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        // 1) current user
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.data?.user ?? authData?.user ?? null;
        if (!user) {
          if (mounted) {
            setDialogs([]);
            setLoading(false);
          }
          return;
        }
        if (mounted) setUserId(user.id);

        // 2) load ALL messages where user participates (for small apps this is fine)
        //    select fields we need: conversation_id, sender_id, receiver_id, body, created_at, metadata
        const { data: messages, error } = await supabase
          .from("messages")
          .select("conversation_id, sender_id, receiver_id, body, created_at, metadata")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: false }); // newest first

        if (error) {
          console.error("Failed to load messages:", error);
          if (mounted) setLoading(false);
          return;
        }

        // 3) Aggregate: pick latest message per conversation and count unread per conversation
        const convMap = new Map(); // conversation_id -> { lastMessage, lastAt, otherUser, unreadCount }
        for (const msg of messages ?? []) {
          const convId = msg.conversation_id;
          if (!convId) continue;

          // determine other user of this message
          const otherUser = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

          // if we haven't stored this conversation yet, store last message info (messages are sorted desc)
          if (!convMap.has(convId)) {
            convMap.set(convId, {
              conversation_id: convId,
              other_user: otherUser,
              lastMessage: msg.body ?? "",
              lastAt: msg.created_at ?? msg.inserted_at ?? null,
              unread: 0,
            });
          }

          // compute unread: message is to current user, and metadata.read_by doesn't include current user
          try {
            const readBy = (msg.metadata && msg.metadata.read_by) || [];
            const alreadyRead = Array.isArray(readBy) ? readBy.includes(user.id) : false;
            if (msg.receiver_id === user.id && !alreadyRead) {
              const entry = convMap.get(convId);
              entry.unread = (entry.unread || 0) + 1;
              convMap.set(convId, entry);
            }
          } catch (e) {
            // if metadata malformed — ignore
          }
        }

        // 4) Prepare array and fetch profiles for other users
        const convArray = Array.from(convMap.values());

        const otherUserIds = Array.from(
          new Set(convArray.map((c) => c.other_user).filter(Boolean))
        );

        let profiles = [];
        if (otherUserIds.length > 0) {
          const { data: profilesData, error: profErr } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", otherUserIds);

          if (profErr) {
            console.error("profiles fetch error:", profErr);
          } else {
            profiles = profilesData ?? [];
          }
        }

        // Map profiles by id
        const profilesMap = new Map((profiles || []).map((p) => [p.id, p]));

        // 5) Enrich convArray with profile data and format time & preview
        const enriched = convArray.map((c) => {
          const prof = profilesMap.get(c.other_user) || null;
          const name = prof?.full_name || `Пользователь ${c.other_user?.slice(0, 6) || ""}`;
          const avatar = prof?.avatar_url || null;
          // format time to HH:MM
          let time = "";
          if (c.lastAt) {
            try {
              time = new Date(c.lastAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            } catch {
              time = "";
            }
          }
          return {
            ...c,
            otherName: name,
            otherAvatar: avatar,
            preview: c.lastMessage?.length > 80 ? c.lastMessage.slice(0, 77) + "..." : c.lastMessage,
            time,
          };
        });

        // sort by lastAt desc
        enriched.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));

        if (mounted) {
          setDialogs(enriched);
          setLoading(false);
        }
      } catch (e) {
        console.error("loadDialogs exception:", e);
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => (mounted = false);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Диалоги</h2>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto", fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Диалоги</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/chat/new">
            <button style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6e6e6", background: "#fff", cursor: "pointer" }}>
              ➕ Новый чат
            </button>
          </Link>
        </div>
      </div>

      {dialogs.length === 0 ? (
        <div style={{ padding: 20, background: "#fafafa", borderRadius: 10 }}>У вас пока нет сообщений.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {dialogs.map((d) => (
            <Link
              key={d.conversation_id}
              href={`/chat/${d.conversation_id}?user=${d.other_user}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 10,
                  background: "#fff",
                  boxShadow: "0 1px 0 rgba(10,10,10,0.03)",
                  cursor: "pointer",
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "#ddd", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {d.otherAvatar ? (
                    <img src={d.otherAvatar} alt={d.otherName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ fontSize: 14, color: "#555" }}>{(d.otherName || "U").slice(0, 2)}</div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.otherName}</div>
                    <div style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>{d.time}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <div style={{ color: "#666", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>
                      {d.preview || "—"}
                    </div>
                    {d.unread > 0 ? (
                      <div style={{ marginLeft: 8 }}>
                        <div style={{ minWidth: 28, height: 28, borderRadius: 14, background: "#ff4d4f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                          {d.unread > 99 ? "99+" : d.unread}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
