import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { FaLinkedin, FaGithub, FaSearch, FaExternalLinkAlt, FaSortAlphaDown, FaSortAlphaUp } from "react-icons/fa";

// -----------------------------
// ВНИМАНИЕ:
// DevCard / Avatar / SocialLinks / Bio — скопированы/сохранены буквально,
// чтобы внешний вид карточек НЕ изменился.
// -----------------------------

type Social = {
  linkedin?: string;
  github?: string;
};

type Dev = {
  name: string;
  role: string;
  bio?: string;
  photo?: string;
  social?: Social;
};

type AboutProps = {
  developers?: Dev[];
  title?: string;
  description?: string;
};

const DEFAULT_DEVS: Dev[] = [
  {
    name: "Маметжан Абзал",
    role: "Full-Stack Engineer | UI/UX Designer | Optimization & Performance Specialist | QA & Support",
    bio: "Абзал — универсальный разработчик проекта Korshi.kz. От фронтенда до бэкенда, от дизайна до оптимизации — я создаю комплексные решения, которые делают жизнь пользователей проще и приятнее. Люблю продумывать удобные интерфейсы и красивые решения, которые действительно работают 💙",
    photo: "https://github.com/AbaD3v.png",
    social: {
      linkedin: "https://www.linkedin.com/in/abzal-mametzhan-63264a388/",
      github: "https://github.com/AbaD3v",
    },
  },
  {
    name: "Болатов Диас",
    role: "Graphic Designer & Branding Specialist",
    bio: "Диас разработал уникальный логотип продукта и обеспечил целостный визуальный стиль — от дизайна до итогового оформления. Его внимание к деталям и творческий подход помогли создать запоминающийся образ Korshi.kz.",
    photo: "https://github.com/DiasD3v.png",
    social: {
      linkedin:
        "https://www.linkedin.com/in/%D0%B1%D0%BE%D0%BB%D0%B0%D1%82%D0%BE%D0%B2-%D0%B4%D0%B8%D0%B0%D1%81-282a5b39a/?skipRedirect=true",
      github: "https://github.com/DiasD3v",
    },
  },
  {
    name: "Мукашев Аядиль",
    role: "SMM-Marketer",
    bio: "Аядиль, СММ-маркетолог платформы Korshi.kz, отвечает за стратегию продвижения: управление социальными сетями, разработку контента и визуального стиля, взаимодействие с аудиторией и анализ эффективности кампаний.",
    photo: "https://github.com/mukasevaadil2-cmd.png",
    social: {
      linkedin: "https://www.linkedin.com/in/aya-mkashev-5a7287393/",
      github: "https://github.com/mukasevaadil2-cmd",
    },
  },
  {
    name: "Мыңбаев Бейбарыс",
    role: "Frontend Developer & QA Tester | UI/UX Designer | Creative Problem Solver",
    bio: "Бейбарыс - один из разработчиков/руководителей Korshi kz, придумавший идею нашего проекта и реализовавший фундамент для дальнейшего развития проекта.",
    photo: "https://github.com/Terbarys.png",
    social: {
      linkedin: "https://www.linkedin.com/in/beibarys-myngbayev-599778382/",
      github: "https://github.com/Terbarys",
    },
  },
];

const isValidUrl = (u?: string) => {
  if (!u) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch (e) {
    return false;
  }
};

const Avatar: React.FC<{ src?: string; name: string; size?: number }> = React.memo(({ src, name, size = 120 }) => {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=ffffff&color=000`;
  const [imgSrc, setImgSrc] = React.useState(src || fallback);

  return (
    <img
      src={imgSrc}
      alt={name}
      loading="lazy"
      width={size}
      height={size}
      onError={() => setImgSrc(fallback)}
      className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full object-cover shadow-sm"
    />
  );
});
Avatar.displayName = "Avatar";

const SocialLinks: React.FC<{ social?: Social; size?: "sm" | "md" }> = ({ social, size = "md" }) => {
  const base = size === "sm" ? "text-lg" : "text-xl";
  return (
    <div className={`mt-2 flex items-center gap-3 ${base}`}>
      {social?.linkedin && isValidUrl(social.linkedin) && (
        <a
          className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-2"
          href={social.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn profile"
        >
          <FaLinkedin />
        </a>
      )}
      {social?.github && isValidUrl(social.github) && (
        <a
          className="focus:outline-none focus:ring-2 focus:ring-gray-500 rounded p-2"
          href={social.github}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub profile"
        >
          <FaGithub />
        </a>
      )}
    </div>
  );
};

const Bio: React.FC<{ text?: string; maxChars?: number }> = ({ text = "", maxChars = 140 }) => {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  if (text.length <= maxChars) return <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{text}</p>;

  return (
    <div className="mt-2 text-left">
      <p className="text-sm text-gray-600 dark:text-gray-300">{open ? text : `${text.slice(0, maxChars).trim()}…`}</p>
      <button
        onClick={() => setOpen((s) => !s)}
        className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400"
        aria-expanded={open}
      >
        {open ? "Показать меньше" : "Показать ещё"}
      </button>
    </div>
  );
};

const DevCard: React.FC<{ dev: Dev; onOpen: (d: Dev) => void }> = React.memo(({ dev, onOpen }) => {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(dev)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(dev);
      }}
      aria-label={`О карточке разработчика ${dev.name}`}
      className="w-full h-full bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-lg shadow-md hover:shadow-lg flex flex-col gap-4 items-stretch transition-shadow duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer border border-gray-200 dark:border-gray-700"
    >
      {/* Аватар контейнер */}
      <div className="flex justify-center">
        <div className="flex-shrink-0">
          <Avatar src={dev.photo} name={dev.name} size={100} />
        </div>
      </div>

      {/* Основная информация */}
      <div className="flex-1 flex flex-col items-center text-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 line-clamp-2">{dev.name}</h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{dev.role}</p>
        
        {/* Bio */}
        <div className="mt-3 w-full flex-1 flex flex-col justify-start">
          {dev.bio && (
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
              {dev.bio}
            </p>
          )}
        </div>

        {/* Социальные ссылки */}
        <div className="mt-4 w-full flex justify-center">
          <SocialLinks social={dev.social} size="sm" />
        </div>
      </div>

      {/* Кнопка подробнее */}
      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 w-full">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen(dev);
          }}
          className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          aria-label={`Открыть профиль ${dev.name}`}
        >
          Подробнее <FaExternalLinkAlt className="text-xs" />
        </button>
      </div>
    </article>
  );
});
DevCard.displayName = "DevCard";

// -----------------------------
// Новые утилиты и компоненты: debounce, toast, chips, vCard generator, focus trap
// -----------------------------
function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

const Toast: React.FC<{ message?: string; onClose: () => void }> = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose(), 2600);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg"
      aria-live="polite"
    >
      {message}
    </div>
  );
};

// create vCard string
const makeVCard = (dev: Dev) => {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${dev.name}`,
    dev.role ? `TITLE:${dev.role}` : "",
    dev.social?.github ? `URL;TYPE=github:${dev.social.github}` : "",
    dev.social?.linkedin ? `URL;TYPE=linkedin:${dev.social.linkedin}` : "",
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\n");
};

// small helper to respect reduced motion user preference
const prefersReducedMotion = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

// -----------------------------
// Улучшенный About component
// -----------------------------
export default function About({ developers = DEFAULT_DEVS, title, description }: AboutProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 260);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Dev | null>(null);
  const [sort, setSort] = useState<"name-asc" | "name-desc" | "role">("name-asc");
  const [toast, setToast] = useState<string | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const prefersReduced = useMemo(() => prefersReducedMotion(), []);

  // keyboard shortcuts: "/" to focus search
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSelected(null);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // roles list
  const roles = useMemo(() => {
    const setRoles = new Set<string>();
    developers.forEach((d) => setRoles.add(d.role));
    return ["all", ...Array.from(setRoles)];
  }, [developers]);

  // normalized query & filters
  const normalizedQuery = debouncedQuery.trim().toLowerCase();

  // filtering + sorting
  const filtered = useMemo(() => {
    let items = developers.filter((d) => {
      const matchQuery =
        !normalizedQuery ||
        d.name.toLowerCase().includes(normalizedQuery) ||
        (d.bio || "").toLowerCase().includes(normalizedQuery) ||
        d.role.toLowerCase().includes(normalizedQuery);

      const matchRole = roleFilter === "all" || d.role === roleFilter;
      return matchQuery && matchRole;
    });

    if (sort === "name-asc") items = items.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "name-desc") items = items.sort((a, b) => b.name.localeCompare(a.name));
    if (sort === "role") items = items.sort((a, b) => a.role.localeCompare(b.role));

    return items;
  }, [developers, normalizedQuery, roleFilter, sort]);

  // animated card appearance: we will set inline style with delay for each card.
  useEffect(() => {
    // when list changes, small reflow to trigger transitions if not reduced motion
    if (prefersReduced) return;
    const el = containerRef.current;
    if (!el) return;
    // add a class to trigger transitions (cards already have base transition)
    el.querySelectorAll("[data-animated]").forEach((node: Element, i) => {
      (node as HTMLElement).style.transitionDelay = `${i * 60}ms`;
      (node as HTMLElement).classList.add("opacity-100", "translate-y-0");
    });
  }, [filtered, prefersReduced]);

  // lock scroll when modal open (mobile)
  useEffect(() => {
    if (selected) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selected]);

  // modal focus trap
  const modalRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!selected || !modalRef.current) return;
    const modal = modalRef.current;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    // focus the modal container first
    (first || modal).focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [selected]);

  // handlers
  const clearSearch = useCallback(() => setQuery(""), []);
  const toggleRole = useCallback((r: string) => setRoleFilter((s) => (s === r ? "all" : r)), []);
  const openProfile = useCallback((d: Dev) => setSelected(d), []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Ссылка скопирована в буфер обмена");
    } catch {
      setToast("Не удалось скопировать");
    }
  };

  const downloadVCard = useCallback((d: Dev) => {
    const v = makeVCard(d);
    const blob = new Blob([v], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${d.name.replace(/\s+/g, "_")}.vcf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToast("vCard загружается");
  }, []);

  // touch swipe down to close modal (mobile)
  useEffect(() => {
    if (!selected) return;
    let startY = 0;
    const el = modalRef.current;
    if (!el) return;

    const touchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    const touchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - startY;
      if (dy > 120) {
        setSelected(null);
      }
    };
    el.addEventListener("touchstart", touchStart);
    el.addEventListener("touchmove", touchMove);
    return () => {
      el.removeEventListener("touchstart", touchStart);
      el.removeEventListener("touchmove", touchMove);
    };
  }, [selected]);

  // small keyboard nav inside modal: ArrowLeft/ArrowRight -> prev/next developer
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const idx = filtered.findIndex((x) => x.name === selected.name && x.role === selected.role);
        if (idx === -1) return;
        const nextIdx = e.key === "ArrowRight" ? (idx + 1) % filtered.length : (idx - 1 + filtered.length) % filtered.length;
        setSelected(filtered[nextIdx]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, filtered]);

  // counts per role for chips
  const roleCounts = useMemo(() => {
    const m: Record<string, number> = {};
    developers.forEach((d) => {
      m[d.role] = (m[d.role] || 0) + 1;
    });
    return m;
  }, [developers]);

  return (
    <section className="p-4 sm:p-8 max-w-5xl mx-auto">
      <header className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {title || "О проекте Korshi.kz"}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
              {description ||
                "Korshi.kz — платформа для поиска соседей и жилья по Казахстану. Создана для студентов, айтишников и всех, кто ищет комфортное жильё и дружелюбных соседей 💙"}
            </p>

            {/* stats */}
            <div className="mt-3 flex items-center gap-3 text-sm text-gray-500">
              <div className="inline-flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">{developers.length}</span>
                <span>участник{developers.length > 1 ? "ов" : ""}</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">{filtered.length}</span>
                <span>показано</span>
              </div>
            </div>
          </div>

          {/* action buttons */}
          <div className="flex gap-2 items-center">
            <button
              onClick={() => {
                setSort((s) => (s === "name-asc" ? "name-desc" : "name-asc"));
                setToast(`Сортировка: ${sort === "name-asc" ? "По имени (убыв.)" : "По имени (возр.)"}`);
              }}
              aria-label="Переключить сортировку"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {sort === "name-asc" ? <FaSortAlphaDown /> : <FaSortAlphaUp />} {sort === "name-asc" ? "A → Z" : "Z → A"}
            </button>
            <button
              onClick={() => {
                setSort("role");
                setToast("Сортировка: по роли");
              }}
              aria-label="Сортировать по роли"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Роли
            </button>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <label className="relative w-full">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Поиск по имени, роли или биографии... (нажмите / для быстрого поиска)"
            aria-label="Поиск разработчиков"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <FaSearch />
          </span>
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              aria-label="Очистить поиск"
            >
              Очистить
            </button>
          )}
        </label>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="py-2 px-3 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none max-w-xs"
            aria-label="Фильтр по роли"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r === "all" ? "Все роли" : r}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="py-2 px-3 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none"
            aria-label="Сортировка"
          >
            <option value="name-asc">Имя: A → Z</option>
            <option value="name-desc">Имя: Z → A</option>
            <option value="role">По роли</option>
          </select>
        </div>
      </div>

      {/* role chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setRoleFilter("all")}
          className={`px-3 py-1 rounded-full border ${roleFilter === "all" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"} text-sm`}
          aria-pressed={roleFilter === "all"}
        >
          Все ({developers.length})
        </button>
        {Object.entries(roleCounts).map(([r, c]) => (
          <button
            key={r}
            onClick={() => setRoleFilter((s) => (s === r ? "all" : r))}
            className={`px-3 py-1 rounded-full border text-sm ${roleFilter === r ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"}`}
            aria-pressed={roleFilter === r}
          >
            {r} ({c})
          </button>
        ))}
      </div>

      {/* Grid with animated appearance */}
      <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full" aria-live="polite">
        {filtered.map((dev, i) => (
          <div
            key={dev.name + i}
            data-animated
            className="h-full"
            style={{
              transition: prefersReduced ? "none" : "transform 360ms cubic-bezier(.2,.9,.2,1), opacity 360ms",
              transform: prefersReduced ? "none" : "translateY(8px)",
              opacity: prefersReduced ? 1 : 0,
            }}
          >
            <DevCard dev={dev} onOpen={(d) => openProfile(d)} />
          </div>
        ))}
      </div>

      {/* Modal / Details */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Детали разработчика ${selected.name}`}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
          onClick={() => setSelected(null)}
        >
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full h-[85vh] sm:h-auto sm:max-w-2xl bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl overflow-auto focus:outline-none"
            tabIndex={-1}
            aria-live="polite"
          >
            <div className="flex items-start gap-4">
              <Avatar src={selected.photo} name={selected.name} size={140} />
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selected.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selected.role}</p>
              </div>
              <div className="ml-2 flex gap-2 items-center">
                <button
                  onClick={() => {
                    copyToClipboard(selected.social?.github || "");
                  }}
                  aria-label="Копировать ссылку на GitHub"
                  className="p-2 rounded-full focus:ring-2 focus:ring-blue-400"
                >
                  📋
                </button>
                <button
                  onClick={() => downloadVCard(selected)}
                  aria-label="Скачать vCard"
                  className="p-2 rounded-full focus:ring-2 focus:ring-blue-400"
                >
                  💾
                </button>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Закрыть"
                  className="ml-1 p-2 rounded-full focus:ring-2 focus:ring-blue-400"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="mt-4 text-gray-700 dark:text-gray-300">
              <p className="text-sm whitespace-pre-line">{selected.bio}</p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <SocialLinks social={selected.social} />
              <div className="flex items-center gap-2">
                {selected.social?.github && isValidUrl(selected.social.github) && (
                  <a
                    href={selected.social.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700"
                  >
                    Открыть на GitHub <FaExternalLinkAlt className="text-xs" />
                  </a>
                )}
                {selected.social?.linkedin && isValidUrl(selected.social.linkedin) && (
                  <a
                    href={selected.social.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <Toast message={toast} onClose={() => setToast(undefined)} />
    </section>
  );
}
