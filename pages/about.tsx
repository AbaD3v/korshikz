import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { FaLinkedin, FaGithub, FaSearch, FaExternalLinkAlt, FaShareAlt, FaCopy } from "react-icons/fa";

// **Max-improved — "WOW" mobile-first About component**
// Highlights:
// - Polished mobile-first layout with responsive grid (1 → 2 → 3 cols)
// - Animated, tactile cards (micro-interactions) and entrance animation
// - Horizontal role chips on mobile + select on wide screens
// - Truncated bios with smart "Показать ещё" and inline read-more animation
// - Full-screen modal on mobile with focus-trap, share & copy actions
// - Sticky compact search bar when scrolling on mobile for quick access
// - Accessible: keyboard handlers, aria attributes, proper focus management
// - Lightweight CSS animations inside component (no external deps)

type Social = { linkedin?: string; github?: string };

type Dev = { name: string; role: string; bio?: string; photo?: string; social?: Social };

type AboutProps = { developers?: Dev[]; title?: string; description?: string };

const DEFAULT_DEVS: Dev[] = [
  {
    name: "Маметжан Абзал",
    role: "Full-Stack Engineer | UI/UX Designer | Optimization & Performance Specialist | QA & Support",
    bio:
      "Абзал — универсальный разработчик проекта Korshi.kz. От фронтенда до бэкенда, от дизайна до оптимизации — я создаю комплексные решения, которые делают жизнь пользователей проще и приятнее. Люблю продумывать удобные интерфейсы и красивые решения, которые действительно работают 💙",
    photo: "https://github.com/AbaD3v.png",
    social: { linkedin: "https://www.linkedin.com/in/abzal-mametzhan-63264a388/", github: "https://github.com/AbaD3v" },
  },
  {
    name: "Болатов Диас",
    role: "Graphic Designer & Branding Specialist",
    bio:
      "Диас разработал уникальный логотип продукта и обеспечил целостный визуальный стиль — от дизайна до итогового оформления. Его внимание к деталям и творческий подход помогли создать запоминающийся образ Korshi.kz.",
    photo: "https://github.com/DiasD3v.png",
    social: { linkedin: "https://www.linkedin.com/in/%D0%B1%D0%BE%D0%BB%D0%B0%D1%82%D0%BE%D0%B2-%D0%B4%D0%B8%D0%B0%D1%81-282a5b39a/?skipRedirect=true", github: "https://github.com/DiasD3v" },
  },
  {
    name: "Мукашев Аядиль",
    role: "SMM-Marketer",
    bio:
      "Аядиль, СММ-маркетолог платформы Korshi.kz, отвечает за стратегию продвижения: управление социальными сетями, разработку контента и визуального стиля, взаимодействие с аудиторией и анализ эффективности кампаний.",
    photo: "https://github.com/mukasevaadil2-cmd.png",
    social: { linkedin: "https://www.linkedin.com/in/aya-mkashev-5a7287393/", github: "https://github.com/mukasevaadil2-cmd" },
  },
  {
    name: "Мыңбаев Бейбарыс",
    role: "Frontend Developer & QA Tester | UI/UX Designer | Creative Problem Solver",
    bio:
      "Бейбарыс - один из разработчиков/руководителей Korshi kz, придумавший идею нашего проекта и реализовавший фундамент для дальнейшего развития проекта.",
    photo: "https://github.com/Terbarys.png",
    social: { linkedin: "https://www.linkedin.com/in/beibarys-myngbayev-599778382/", github: "https://github.com/Terbarys" },
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

// Animated avatar with safer fallback and loading state
const Avatar: React.FC<{ src?: string; name: string; size?: number }> = React.memo(({ src, name, size = 120 }) => {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=FFFFFF&color=000`;
  const [imgSrc, setImgSrc] = React.useState(src || fallback);
  const [loaded, setLoaded] = React.useState(false);

  return (
    <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-100 to-white dark:from-gray-800 dark:to-gray-900 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
      <img
        src={imgSrc}
        alt={name}
        loading="lazy"
        width={size}
        height={size}
        onError={() => setImgSrc(fallback)}
        onLoad={() => setLoaded(true)}
        className={`object-cover w-full h-full transform transition-transform duration-500 ${loaded ? "scale-100" : "scale-105 blur-sm"}`}
      />
    </div>
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

// Smart bio with animated reveal
const Bio: React.FC<{ text?: string; maxChars?: number }> = ({ text = "", maxChars = 120 }) => {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const short = text.length > maxChars ? `${text.slice(0, maxChars).trim()}…` : text;
  return (
    <div className="mt-2 text-left">
      <p className={`text-sm text-gray-600 dark:text-gray-300 transition-all duration-300 ${open ? "max-h-96" : "max-h-20 overflow-hidden"}`}>{open ? text : short}</p>
      {text.length > maxChars && (
        <button onClick={() => setOpen((s) => !s)} className="mt-2 text-sm font-semibold text-blue-600 dark:text-blue-400" aria-expanded={open}>
          {open ? "Показать меньше" : "Показать ещё"}
        </button>
      )}
    </div>
  );
};

const DevCard: React.FC<{ dev: Dev; onOpen: (d: Dev) => void; index: number }> = React.memo(({ dev, onOpen, index }) => {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(dev)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(dev);
      }}
      aria-label={`О карточке разработчика ${dev.name}`}
      className={`w-full bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer animate-fadeInUp`}>
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0">
          <Avatar src={dev.photo} name={dev.name} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{dev.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate" title={dev.role}>{dev.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <SocialLinks social={dev.social} size="sm" />
            </div>
          </div>

          <Bio text={dev.bio} maxChars={110} />

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2"> 
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">#{dev.name.split(" ")[0]}</span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isValidUrl(dev.social?.github)) window.open(dev.social!.github, "_blank", "noopener,noreferrer");
              }}
              className="ml-2 inline-flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
              aria-label={`Открыть профиль ${dev.name} на GitHub`}
            >
              Подробнее <FaExternalLinkAlt className="text-xs" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});
DevCard.displayName = "DevCard";

export default function About({ developers = DEFAULT_DEVS, title, description }: AboutProps) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Dev | null>(null);
  const [isSticky, setIsSticky] = useState(false);
  const prevFocused = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const roles = useMemo(() => {
    const setRoles = new Set<string>();
    developers.forEach((d) => setRoles.add(d.role));
    return ["all", ...Array.from(setRoles)];
  }, [developers]);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return developers.filter((d) => {
      const matchQuery =
        !normalizedQuery ||
        d.name.toLowerCase().includes(normalizedQuery) ||
        (d.bio || "").toLowerCase().includes(normalizedQuery) ||
        d.role.toLowerCase().includes(normalizedQuery);

      const matchRole = roleFilter === "all" || d.role === roleFilter;
      return matchQuery && matchRole;
    });
  }, [developers, normalizedQuery, roleFilter]);

  const clearSearch = useCallback(() => setQuery(""), []);

  // Sticky compact search on scroll (mobile-friendly)
  useEffect(() => {
    const onScroll = () => {
      setIsSticky(window.scrollY > 120);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Modal: focus trap + lock body scroll + remember focus
  useEffect(() => {
    if (selected) {
      prevFocused.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";
      // focus first focusable in modal
      setTimeout(() => {
        const focusable = modalRef.current?.querySelector<HTMLElement>(
          'button, a, input, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }, 50);

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setSelected(null);
        if (e.key === "Tab") {
          // simple focus trap
          const modal = modalRef.current;
          if (!modal) return;
          const focusables = Array.from(modal.querySelectorAll<HTMLElement>(
            'a, button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
          )).filter((el) => !el.hasAttribute("disabled"));
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
          } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      };
      window.addEventListener("keydown", onKey);
      return () => {
        window.removeEventListener("keydown", onKey);
        document.body.style.overflow = "";
        prevFocused.current?.focus();
      };
    }
  }, [selected]);

  const onShare = async (dev: Dev) => {
    const shareText = `${dev.name} — ${dev.role} (Korshi.kz)`;
    const url = dev.social?.github || window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: dev.name, text: shareText, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText} — ${url}`);
        alert("Ссылка скопирована в буфер обмена");
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const onCopy = async (dev: Dev) => {
    const url = dev.social?.github || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert("Ссылка скопирована");
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <section className="p-4 sm:p-8 max-w-5xl mx-auto">
      {/* Inline component-specific styles for animations */}
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeInUp { animation: fadeInUp 420ms ease both; }
      `}</style>

      <header className="mb-4 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-2xl p-4 sm:p-6 shadow-inner">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">{title || "О проекте Korshi.kz"}</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">{description || "Korshi.kz — платформа для поиска соседей и жилья по Казахстану. Создана для студентов, айтишников и всех, кто ищет комфортное жильё и дружелюбных соседей 💙"}</p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="px-3 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">Наверх</button>
          </div>
        </div>

        {/* Mobile role chips */}
        <div className="mt-4">
          <div className="flex gap-2 overflow-x-auto py-1">
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium ${r === roleFilter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}
                aria-pressed={r === roleFilter}
              >
                {r === "all" ? "Все роли" : r}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Sticky search when scrolled on mobile */}
      <div className={`mb-4 transition-all ${isSticky ? "fixed left-0 right-0 top-0 z-40 p-2 bg-white dark:bg-gray-900 shadow-md" : "relative"}`}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <label className="relative flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Поиск по имени, роли или биографии..."
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

            <div className="hidden sm:block">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="py-2 px-3 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none"
                aria-label="Фильтр по роли"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r === "all" ? "Все роли" : r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setQuery("");
                  setRoleFilter("all");
                }}
                className="px-3 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                aria-label="Сбросить фильтры"
              >
                Сброс
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((dev, i) => (
          <DevCard key={dev.name + i} dev={dev} index={i} onOpen={(d) => setSelected(d)} />
        ))}
      </div>

      {/* Modal / Details */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Детали разработчика ${selected.name}`}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60"
          onClick={() => setSelected(null)}
        >
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full h-[92vh] sm:h-auto sm:max-w-2xl bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl overflow-auto"
            aria-live="polite"
          >
            <div className="flex items-start gap-4">
              <Avatar src={selected.photo} name={selected.name} size={140} />
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selected.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">{selected.role}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => setSelected(null)} aria-label="Закрыть" className="p-2 rounded-full focus:ring-2 focus:ring-blue-400">✕</button>
                <button onClick={() => onShare(selected)} aria-label="Поделиться" className="p-2 rounded-full focus:ring-2 focus:ring-blue-400"><FaShareAlt /></button>
              </div>
            </div>

            <div className="mt-4 text-gray-700 dark:text-gray-300">
              <p className="text-sm whitespace-pre-line">{selected.bio}</p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <SocialLinks social={selected.social} />
              <div className="flex items-center gap-2">
                {selected.social?.github && isValidUrl(selected.social.github) && (
                  <a href={selected.social.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                    Открыть на GitHub <FaExternalLinkAlt className="text-xs" />
                  </a>
                )}
                <button onClick={() => onCopy(selected)} aria-label="Копировать ссылку" className="p-2 rounded-full focus:ring-2 focus:ring-blue-400"><FaCopy /></button>
              </div>
            </div>

          </div>
        </div>
      )}

    </section>
  );
}
