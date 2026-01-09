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
/** Intent (интент / шаблон) */
export type Intent = {
  id: string;                // уникальный идентификатор интента
  lang: "ru" | "kz" | "any"; // язык
  category: string;           // категория: search, greeting, profile, support, etc.
  priority?: number;          // опциональный приоритет
  patterns: RegExp[];         // regex-паттерны для route
  synonyms?: string[];        // ключевые слова для NLP
  responses?: string[];       // fallback/шаблонные ответы
  responseStrategy?: "static" | "dynamic"; // static = шаблон, dynamic = LLM
  links?: { label: string; href: string }[];
  quickReplies?: string[];
};
/** Интерфейс провайдера ответов (ядро) */
export type ResponseProvider = {
  /** Возвращает полный ответ с метаданными */
  getResponse: (prompt: string, opts?: any) => Promise<BotResponse>;
  /** Опционально: асинхронный генератор чанков текста для incremental output */
  stream?: (prompt: string, opts?: any) => AsyncGenerator<string, void, void>;
};

/** Интерфейс стримингового провайдера (UI/AI) */
export type StreamingProvider = {
  send?: (prompt: string, opts?: any) => Promise<BotResponse>;
  stream?: (prompt: string, opts?: any) => AsyncGenerator<string, void, void>;
};

/** Сообщение в диалоге */
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

/** Контекстный стор */
export interface ContextStorePort {
  get: (key: string) => Promise<Record<string, unknown> | null>;
  set: (key: string, value: Record<string, unknown>) => Promise<void>;
  delete: (key: string) => Promise<void>;
  getAll?: () => Promise<Record<string, Record<string, unknown>>>;
  clear?: () => Promise<void>;
}

/** Конфигурация чат-ядра */
export interface ChatbotConfig {
  provider: ResponseProvider;
  contextStore?: ContextStorePort;
  locale?: "ru" | "kz" | string;
  initialMessages?: ChatMessage[];
  enableStreaming?: boolean;
  onMessage?: (msg: ChatMessage) => void;
  [key: string]: unknown;
}
