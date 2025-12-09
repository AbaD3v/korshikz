import React, { useMemo, useState, useCallback } from "react";
import { FaLinkedin, FaGithub, FaSearch, FaExternalLinkAlt } from "react-icons/fa";

// Improved and production-ready single-file React component for the "About" section.
// Features:
// - TypeScript types
// - Props support with sensible defaults
// - Accessible, keyboard-friendly cards and modal
// - Image lazy-loading with graceful fallback
// - Search + filter by role
// - Memoized subcomponents for performance
// - Focus & hover styles for accessibility
// - Clear code comments and small utility helpers

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

// Small URL validator (safe guard before rendering external links)
const isValidUrl = (u?: string) => {
  if (!u) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch (e) {
    return false;
  }
};

// Avatar component with graceful fallback
const Avatar: React.FC<{ src?: string; name: string; size?: number }> = React.memo(({ src, name, size = 96 }) => {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=fff&color=000`;
  const [imgSrc, setImgSrc] = useState(src || fallback);

  return (
    <img
      src={imgSrc}
      alt={name}
      loading="lazy"
      width={size}
      height={size}
      onError={() => setImgSrc(fallback)}
      className="w-24 h-24 sm:w-32 sm:h-32 rounded-full mb-4 object-cover shadow-inner"
    />
  );
});

Avatar.displayName = "Avatar";

// Social links component
const SocialLinks: React.FC<{ social?: Social }> = ({ social }) => {
  return (
    <div className="mt-3 flex gap-3 text-xl">
      {social?.linkedin && isValidUrl(social.linkedin) && (
        <a
          className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
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
          className="focus:outline-none focus:ring-2 focus:ring-gray-400 rounded p-1"
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

// Individual developer card
const DevCard: React.FC<{ dev: Dev; onOpen: (d: Dev) => void }> = React.memo(({ dev, onOpen }) => {
  return (
    <article
      tabIndex={0}
      onClick={() => onOpen(dev)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(dev);
      }}
      aria-label={`О карточке разработчика ${dev.name}`}
      className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col items-center transition-transform transform hover:-translate-y-2 hover:shadow-2xl focus:translate-y-0 focus:shadow-2xl cursor-pointer"
    >
      <Avatar src={dev.photo} name={dev.name} />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center">{dev.name}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">{dev.role}</p>
      <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm text-center line-clamp-3">{dev.bio}</p>
      <SocialLinks social={dev.social} />
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isValidUrl(dev.social?.github)) window.open(dev.social!.github, "_blank", "noopener,noreferrer");
        }}
        className="mt-4 inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
        aria-label={`Открыть профиль ${dev.name} на GitHub`}
      >
        Подробнее <FaExternalLinkAlt className="text-xs" />
      </button>
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

  return (
    <section className="p-6 sm:p-10 text-center">
      <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-gray-900 dark:text-gray-100">{title || "О проекте Korshi.kz"}</h1>
      <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-6">
        {description ||
          "Korshi.kz — это платформа для поиска соседей и жилья по Казахстану. Создана для студентов, айтишников и всех, кто ищет комфортное жильё и дружелюбных соседей 💙"}
      </p>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-center mb-6">
        <label className="relative w-full max-w-xl">
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

      {/* Developers grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((dev, i) => (
          <DevCard key={dev.name + i} dev={dev} onOpen={(d) => setSelected(d)} />
        ))}
      </div>

      {/* Simple Modal for details (accessible) */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Детали разработчика ${selected.name}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl text-left"
          >
            <div className="flex gap-4 items-center">
              <Avatar src={selected.photo} name={selected.name} size={128} />
              <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selected.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selected.role}</p>
              </div>
            </div>

            <div className="mt-4 text-gray-700 dark:text-gray-300">
              <p>{selected.bio}</p>
            </div>

            <div className="mt-4 flex justify-end">
              <SocialLinks social={selected.social} />
              <button
                onClick={() => setSelected(null)}
                className="ml-4 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
