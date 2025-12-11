import React, { useMemo, useState, useCallback } from "react";
import { FaLinkedin, FaGithub, FaSearch, FaExternalLinkAlt } from "react-icons/fa";

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
  /* ... твои данные 그대로 ... */
];

// URL safety
const isValidUrl = (u?: string) => {
  if (!u) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

// Avatar
const Avatar: React.FC<{ src?: string; name: string; size?: number }> = React.memo(({ src, name, size = 72 }) => {
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
      className="w-20 h-20 sm:w-28 sm:h-28 rounded-full mb-3 object-cover shadow-inner"
    />
  );
});

// Social links
const SocialLinks: React.FC<{ social?: Social; size?: string }> = ({ social, size = "text-lg" }) => {
  return (
    <div className={`mt-2 flex gap-3 ${size}`}>
      {social?.linkedin && isValidUrl(social.linkedin) && (
        <a className="p-1" href={social.linkedin} target="_blank" rel="noopener noreferrer">
          <FaLinkedin />
        </a>
      )}
      {social?.github && isValidUrl(social.github) && (
        <a className="p-1" href={social.github} target="_blank" rel="noopener noreferrer">
          <FaGithub />
        </a>
      )}
    </div>
  );
};

// Dev card
const DevCard: React.FC<{ dev: Dev; onOpen: (d: Dev) => void }> = React.memo(({ dev, onOpen }) => {
  return (
    <article
      tabIndex={0}
      onClick={() => onOpen(dev)}
      className="bg-white dark:bg-gray-800 px-5 py-6 rounded-2xl shadow-md flex flex-col items-center
                 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] cursor-pointer
                 sm:px-6 sm:py-7"
    >
      <Avatar src={dev.photo} name={dev.name} />
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 text-center">
        {dev.name}
      </h3>

      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center mt-1 leading-tight">
        {dev.role}
      </p>

      <p className="mt-2 text-gray-600 dark:text-gray-300 text-xs sm:text-sm text-center line-clamp-3">
        {dev.bio}
      </p>

      <SocialLinks social={dev.social} size="text-base sm:text-lg" />

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isValidUrl(dev.social?.github)) window.open(dev.social!.github, "_blank");
        }}
        className="mt-3 text-xs sm:text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700
                   hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center gap-1"
      >
        GitHub <FaExternalLinkAlt className="text-[10px]" />
      </button>
    </article>
  );
});

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

  return (
    <section className="p-4 sm:p-8 text-center">
      <h1 className="text-2xl sm:text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100">
        {title || "О проекте Korshi.kz"}
      </h1>

      <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-5 sm:mb-7">
        {description ||
          "Korshi.kz — платформа для поиска соседей и жилья по Казахстану."}
      </p>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-center gap-2 justify-center mb-5 sm:mb-6">
        <label className="relative w-full max-w-md">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 rounded-full border border-gray-200 dark:border-gray-700 
                       bg-gray-50 dark:bg-gray-900 text-sm sm:text-base"
            placeholder="Поиск..."
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            <FaSearch />
          </span>
        </label>

        {/* Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="py-2 px-3 rounded-full border border-gray-200 dark:border-gray-700
                     bg-white dark:bg-gray-800 text-sm sm:text-base"
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {r === "all" ? "Все" : r}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
        {filtered.map((dev, i) => (
          <DevCard key={dev.name + i} dev={dev} onOpen={(d) => setSelected(d)} />
        ))}
      </div>

      {/* Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl p-5 sm:p-6 shadow-2xl text-left"
          >
            <div className="flex gap-3 sm:gap-4 items-center">
              <Avatar src={selected.photo} name={selected.name} size={96} />
              <div>
                <h4 className="text-lg sm:text-xl font-bold">{selected.name}</h4>
                <p className="text-xs sm:text-sm text-gray-500">{selected.role}</p>
              </div>
            </div>

            <p className="mt-3 text-sm sm:text-base text-gray-700 dark:text-gray-300">
              {selected.bio}
            </p>

            <div className="mt-4 flex justify-between items-center">
              <SocialLinks social={selected.social} size="text-xl" />
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-1.5 rounded-full bg-gray-200 dark:bg-gray-700 text-sm"
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
