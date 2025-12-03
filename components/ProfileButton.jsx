import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Link from "next/link";
import useUserProfile from "/hooks/useUserProfile"; 

export default function ProfileButton({ user }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const router = useRouter();

  const { profile, isProfileIncomplete } = useUserProfile();

  useEffect(() => {
    function onPointerDown(e) {
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

  // 🔥 Используем full_name вместо username
  const displayName = profile?.full_name || "Профиль";

  // 🔥 Инициалы из full_name
const initials = (profile?.full_name || profile?.username || "?")
  .split(" ")
  .map(s => s[0])
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
          }
        }}
        className="inline-flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      >
        {/* Аватар */}
        {profile?.avatar_url ? (
          <div
            className="relative rounded-full overflow-hidden"
            style={{ width: avatarSize, height: avatarSize }}
          >
            <Image
              src={profile.avatar_url}
              alt={displayName}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div
            className="flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium"
            style={{ width: avatarSize, height: avatarSize }}
          >
            {initials}
          </div>
        )}

        {/* 🔥 Показываем полное имя */}
       <span className="hidden sm:inline text-sm font-medium">
  {profile?.full_name ?? "Профиль"}
</span>

      </button>

      {open && (
        <div
          ref={panelRef}
          className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg bg-white dark:bg-gray-900 shadow-lg ring-1 ring-black/5 dark:ring-white/10 z-50"
        >
          <div className="py-1">

            {/* Мой профиль */}
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                try {
                  await router.push(`/profile/${user?.id}`);
                } catch (err) {
                  console.error("Navigation error:", err);
                  alert("Не удалось перейти на страницу профиля. Попробуйте снова.");
                }
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Мой профиль
            </button>

            {/* Заполнить профиль (если неполный) */}
            {isProfileIncomplete && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/onboarding");
                }}
                className="w-full text-left px-4 py-2 text-sm font-medium text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
              >
                Заполнить профиль
              </button>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
