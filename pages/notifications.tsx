import { useNotifications } from "@/hooks/useNotifications";

export default function NotificationsPage() {
  const { items, unreadCount, markRead, markAllRead } = useNotifications(50);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1117]">
      <div className="mx-auto max-w-3xl p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Уведомления
          </h1>
          <button
            onClick={() => markAllRead()}
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Прочитать все ({unreadCount})
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-4
                border-gray-200 bg-white
                dark:border-gray-700 dark:bg-[#161922]
                ${n.is_read ? "opacity-80" : ""}`}
            >
              <div className="font-medium text-gray-900 dark:text-white">{n.title}</div>
              {n.body && <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{n.body}</div>}
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                <span>{new Date(n.created_at).toLocaleString()}</span>
                {!n.is_read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Отметить прочитанным
                  </button>
                )}
                {n.link && (
                  <a
                    href={n.link}
                    className="ml-auto text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Открыть →
                  </a>
                )}
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Пока уведомлений нет
            </div>
          )}
        </div>
      </div>
    </div>
  );
}