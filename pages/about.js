import { FaLinkedin, FaGithub } from "react-icons/fa";

const developers = [
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
      linkedin: "https://www.linkedin.com/in/%D0%B1%D0%BE%D0%BB%D0%B0%D1%82%D0%BE%D0%B2-%D0%B4%D0%B8%D0%B0%D1%81-282a5b39a/?skipRedirect=true",
      github: "https://github.com/DiasD3v",
    },
  },
  // Сюда енды Аядиль мен Биба калдыыы
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

export default function About() {
  return (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        О проекте Korshi.kz
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10">
        Korshi.kz — это платформа для поиска соседей и жилья по Казахстану.
        Создана для студентов, айтишников и всех, кто ищет комфортное жильё и дружелюбных соседей 💙
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {developers.map((dev, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col items-center transition-transform transform hover:-translate-y-2 hover:shadow-2xl"
          >
            <img
              src={dev.photo}
              alt={dev.name}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "https://via.placeholder.com/150?text=No+Photo";
              }}
              className="w-32 h-32 rounded-full mb-4 object-cover"
            />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{dev.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{dev.role}</p>
            <p className="mt-2 text-gray-600 dark:text-gray-300">{dev.bio}</p>
            <div className="mt-4 flex gap-4 text-xl">
              {dev.social?.linkedin && (
                <a
                  href={dev.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <FaLinkedin />
                </a>
              )}
              {dev.social?.github && (
                <a
                  href={dev.social.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-800 dark:text-gray-100 hover:text-gray-600 transition-colors"
                >
                  <FaGithub />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
