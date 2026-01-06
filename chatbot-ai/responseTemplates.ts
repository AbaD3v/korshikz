// /chatbot-ai/responseTemplates.ts
import type { Link, BotResponse } from "../chatbot/types/ChatbotTypes";

function makeResponse(
  text: string,
  links?: Link[],
  intent?: string,
  confidence?: number,
  quickReplies?: string[]
): BotResponse {
  const resp: BotResponse = { text };
  if (links) resp.links = links;
  if (intent) resp.intent = intent;
  if (typeof confidence === "number") resp.confidence = confidence;
  if (quickReplies) resp.quickReplies = quickReplies;
  return resp;
}

// --- Greeting / About / Support ---
export const makeGreeting = () =>
  makeResponse("Привет 👋! Я бот Korshi.kz.", [
    { label: "Объявления", href: "/listings" },
    { label: "Создать", href: "/create" },
    { label: "Регистрация", href: "/signup" },
  ], "greeting", 1, ["Объявления", "Создать"]);

export const makeAbout = () =>
  makeResponse("Korshi.kz — платформа для поиска жилья и общения 🏠.", [
    { label: "О нас", href: "/about" },
    { label: "Контакты", href: "/contact" },
  ], "about", 0.9, ["О нас", "Контакты"]);

export const makeSupport = () =>
  makeResponse("Если возникли трудности, напишите нам 📧: abamametzan@gmail.com", [
    { label: "Контакты", href: "/contact" },
    { label: "FAQ", href: "/faq" },
  ], "support", 0.9, ["Поддержка", "FAQ"]);

export const makeFallback = () =>
  makeResponse("Я пока не нашёл точного ответа 🤔.", [
    { label: "О платформе", href: "/about" },
    { label: "Регистрация", href: "/signup" },
    { label: "Контакты", href: "/contact" },
  ], "fallback", 0, ["Поиск", "Регистрация", "Поддержка"]);

// --- Listings ---
export const makeListingsCreate = () =>
  makeResponse("Чтобы создать объявление, перейдите в раздел 'Создать'.", [
    { label: "Создать объявление", href: "/create" },
  ], "listings_create", 0.9, ["Создать", "Мои объявления"]);

export const makeListingsEdit = () =>
  makeResponse("Редактирование доступно в личном кабинете.", [], "listings_edit", 0.9, ["Мои объявления"]);

export const makeListingsDelete = () =>
  makeResponse("Удалить можно через личный кабинет.", [], "listings_delete", 0.9, ["Мои объявления", "Создать"]);

export const makeListingsPricing = () =>
  makeResponse("Размещение объявлений сейчас бесплатное.", [], "listings_pricing", 0.9, ["Создать", "Правила размещения"]);

// --- Search ---
export const makeSearchFind = () =>
  makeResponse("Откройте 'Объявления' и используйте фильтры.", [
    { label: "Поиск", href: "/listings" },
  ], "search_find", 0.9, ["Фильтры", "Карта"]);

export const makeSearchPrice = () =>
  makeResponse("Да, есть фильтр по цене.", [], "search_price", 0.9, ["Фильтр по цене"]);

export const makeSearchDistrict = () =>
  makeResponse("Выберите город, затем район в фильтрах.", [], "search_district", 0.9, ["Выбрать город", "Районы"]);

export const makeSearchRoomRent = () =>
  makeResponse("Есть категория 'Комнаты'.", [], "search_room_rent", 0.9, ["Комнаты", "Квартиры"]);

// --- Profile ---
export const makeProfileRegister = () =>
  makeResponse("Перейдите в раздел 'Регистрация' и заполните форму.", [
    { label: "Регистрация", href: "/signup" },
  ], "profile_register", 0.9, ["Регистрация", "Войти"]);

export const makeProfileLogin = () =>
  makeResponse("Нажмите 'Войти' и введите email и пароль.", [
    { label: "Войти", href: "/login" },
  ], "profile_login", 0.9, ["Войти", "Забыли пароль"]);

export const makeProfileChangePassword = () =>
  makeResponse("Сменить пароль можно в настройках профиля.", [], "profile_change_password", 0.9, ["Безопасность", "Войти"]);

export const makeProfileDeleteAccount = () =>
  makeResponse("Удаление аккаунта доступно в настройках профиля.", [], "profile_delete_account", 0.9, ["Настройки", "Поддержка"]);

// --- Chat ---
export const makeChatWriteNeighbor = () =>
  makeResponse("Откройте 'Чаты' и выберите пользователя.", [
    { label: "Чаты", href: "/chat" },
  ], "chat_write_neighbor", 0.9, ["Чаты", "Написать"]);

export const makeChatCreateGroup = () =>
  makeResponse("Групповые чаты пока не поддерживаются.", [], "chat_create_group", 0.9, ["Чаты", "Фидбек"]);

export const makeChatBlockUser = () =>
  makeResponse("В чате есть опция блокировки.", [], "chat_block_user", 0.9, ["Блокировать", "Пожаловаться"]);
