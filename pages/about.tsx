import React, { useMemo, useState, useCallback, useEffect } from "react";
import { FaLinkedin, FaGithub, FaSearch, FaExternalLinkAlt } from "react-icons/fa";

// Mobile-first, production-ready About component
// - Improved mobile layout (single-column cards, full-width avatars, compact controls)
// - Truncated bios with "Показать ещё" toggle
// - Modal becomes full-screen on small devices and centered on larger screens
// - Reduced paddings and touch-friendly tap targets
// - Accessibility: keyboard handlers, aria attributes, focus management

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
      className="w-full bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex gap-4 items-start transition-transform hover:translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
    >
      <div className="flex-shrink-0">
        <Avatar src={dev.photo} name={dev.name} />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{dev.name}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{dev.role}</p>
        <Bio text={dev.bio} maxChars={100} />

        <div className="mt-3 flex items-center justify-between">
          <SocialLinks social={dev.social} size="sm" />
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
    </article>
  );
});
DevCard.displayName = "DevCard";

export default function About({ developers = DEFAULT_DEVS, title, description }: AboutProps) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Dev | null>(null);

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

  useEffect(() => {
    // Lock body scroll when modal is open (mobile friendly)
    if (selected) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selected]);

  return (
    <section className="p-4 sm:p-8 max-w-4xl mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{title || "О проекте Korshi.kz"}</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">{description || "Korshi.kz — платформа для поиска соседей и жилья по Казахстану. Создана для студентов, айтишников и всех, кто ищет комфортное жильё и дружелюбных соседей 💙"}</p>
      </header>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <label className="relative w-full">
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
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.map((dev, i) => (
          <DevCard key={dev.name + i} dev={dev} onOpen={(d) => setSelected(d)} />
        ))}
      </div>

      {/* Modal / Details (accessible) */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Детали разработчика ${selected.name}`}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full h-[85vh] sm:h-auto sm:max-w-2xl bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl overflow-auto"
            aria-live="polite"
          >
            <div className="flex items-start gap-4">
              <Avatar src={selected.photo} name={selected.name} size={140} />
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selected.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selected.role}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Закрыть"
                className="ml-2 p-2 rounded-full focus:ring-2 focus:ring-blue-400"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 text-gray-700 dark:text-gray-300">
              <p className="text-sm whitespace-pre-line">{selected.bio}</p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <SocialLinks social={selected.social} />
              <div>
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
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
