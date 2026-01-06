// /chatbot/types/ChatbotTypes.ts
/**
 * Общие типы для чат-бота
 */

/** Ссылка в ответе */
export type Link = {
  label: string;
  href: string;
};

/** Ответ от бота с опциональными метаданными */
export type BotResponse = {
  text: string;
  intent?: string;
  confidence?: number; // 0..1
  sources?: { title?: string; url: string }[];
  explanation?: string;
  links?: Link[];
  quickReplies?: string[];
};

/** Интерфейс провайдера ответов */
export type ResponseProvider = {
  /** Возвращает полный ответ с метаданными */
  getResponse: (prompt: string, opts?: any) => Promise<BotResponse | string>;
  /** Опционально: асинхронный генератор чанков текста для incremental output */
  stream?: (prompt: string, opts?: any) => AsyncGenerator<string, void, void>;
};

/** Сообщение в диалоге (используется в UI и в ядре) */
export type ChatMessage = {
  id: string;
  role: "user" | "ai" | "system" | "bot";
  text: string;
  timestamp: number;
  intent?: string;
  confidence?: number;
  links?: Link[];
  quickReplies?: string[];
  partial?: boolean;
};

/**
 * Порт для хранения контекста (контекстный стор).
 * Реализация может быть in-memory, localStorage, IndexedDB, серверный и т.д.
 */
export interface ContextStorePort {
  /** Получить контекст по ключу */
  get: (key: string) => Promise<Record<string, unknown> | null>;
  /** Сохранить контекст по ключу */
  set: (key: string, value: Record<string, unknown>) => Promise<void>;
  /** Удалить контекст по ключу */
  delete: (key: string) => Promise<void>;
  /** Получить все контексты (опционально) */
  getAll?: () => Promise<Record<string, Record<string, unknown>>>;
  /** Очистить все контексты (опционально) */
  clear?: () => Promise<void>;
}

/** Конфигурация чат-ядра */
export interface ChatbotConfig {
  provider?: ResponseProvider;
  contextStore?: ContextStorePort;
  locale?: "ru" | "kz" | string;
  initialMessages?: ChatMessage[];
  enableStreaming?: boolean;
  onMessage?: (msg: ChatMessage) => void;
  [key: string]: unknown;
}
