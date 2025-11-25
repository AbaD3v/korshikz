import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Link from "next/link";

export default function ProfileButton({ user }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function onPointerDown(e) {
      // close when clicking outside
      if (!panelRef.current || !btnRef.current) return;
      if (panelRef.current.contains(e.target) || btnRef.current.contains(e.target)) return;
      setOpen(false);
    }

    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const avatarSize = 40;

  const initials = (user?.username || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative inline-block text-left">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            // focus first item later if needed
          }
        }}
        className="inline-flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">
        {user?.avatar_url ? (
          <div className="relative rounded-full overflow-hidden" style={{ width: avatarSize, height: avatarSize }}>
            <Image src={user.avatar_url} alt={user.username || "avatar"} fill className="object-cover" />
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium" style={{ width: avatarSize, height: avatarSize }}>
            {initials}
          </div>
        )}

        <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-200">{user?.username ?? "Профиль"}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div ref={panelRef} className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg bg-white dark:bg-gray-900 shadow-lg ring-1 ring-black/5 dark:ring-white/10 z-50">
          <div className="py-1">
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  const target = `/profile/${user?.id ?? ""}`;
                  const current = router.asPath.split("?")[0];
                  setOpen(false);
                  if (current === target) return;
                  try {
                    await router.push(target);
                  } catch (err) {
                    console.error("Navigation error:", err);
                    alert("Не удалось перейти на страницу профиля. Попробуйте снова.");
                  }
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Мой профиль
              </button>
          </div>
        </div>
      )}
    </div>
  );
}
