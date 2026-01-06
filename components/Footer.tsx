import React from "react";

type FooterProps = {
  theme?: "light" | "dark"; // если захочешь управлять темой через пропсы
};

export default function Footer({ theme }: FooterProps) {
  return (
    <footer
      className={`
        border-t mt-10 py-6 px-6 text-sm text-center transition-colors
        bg-gray-50 dark:bg-gray-900
        border-gray-200 dark:border-gray-700
        text-gray-600 dark:text-gray-400
      `}
      role="contentinfo"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-center sm:text-left">
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold text-primary dark:text-primary-light">
            Korshi.kz
          </span>{" "}
          — все права защищены.
        </p>

        <nav aria-label="Footer navigation">
          <ul className="flex space-x-4">
            <li>
              <a
                href="/about"
                className="hover:text-primary dark:hover:text-primary-light transition"
              >
                О проекте
              </a>
            </li>
            <li>
              <a
                href="mailto:abamametzan@gmail.com"
                className="hover:text-primary dark:hover:text-primary-light transition"
              >
                Связаться
              </a>
            </li>
            <li>
              <a
                href="https://github.com/AbaD3v/korshikz"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary dark:hover:text-primary-light transition"
              >
                GitHub
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
