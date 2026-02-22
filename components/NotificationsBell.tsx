import Link from "next/link";
import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";

export default function NotificationsBell() {
  const { items, unreadCount, markRead, markAllRead } = useNotifications(20);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl border px-3 py-2 text-sm
          border-gray-300 bg-white hover:bg-gray-50
          dark:border-gray-700 dark:bg-[#1a1d26] dark:hover:bg-[#222531]"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 rounded-full bg-red-600 text-white text-xs px-2 py-0.5">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[360px] max-w-[90vw] rounded-2xl border shadow-xl z-50 overflow-hidden
            border-gray-200 bg-white
            dark:border-gray-700 dark:bg-[#161922]"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="font-semibold">Уведомления</div>
            <button
              onClick={() => markAllRead()}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Прочитать все
            </button>
          </div>

          <div className="max-h-[420px] overflow-auto">
            {items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
                Пока уведомлений нет
              </div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b last:border-b-0 border-gray-100 dark:border-gray-800
                    ${n.is_read ? "opacity-70" : "bg-blue-50/60 dark:bg-blue-950/25"}`}
                >
                  <div className="text-sm font-medium">{n.title}</div>
                  {n.body && (
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {n.body}
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-3">
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => {
                          markRead(n.id);
                          setOpen(false);
                        }}
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Открыть
                      </Link>
                    ) : (
                      <button
                        onClick={() => markRead(n.id)}
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Ок
                      </button>
                    )}

                    {!n.is_read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="text-xs text-gray-500 hover:underline dark:text-gray-400"
                      >
                        Отметить прочитанным
                      </button>
                    )}

                    <span className="ml-auto text-xs text-gray-400">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Все уведомления →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}