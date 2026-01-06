// /chatbot-ai/telemetry.ts

export type TelemetryEvent = {
  type: "route" | "unknown";
  prompt: string;
  intent?: string;
  confidence?: number;
  timestamp: number;
};

const STORAGE_KEY = "korshi_chat_telemetry";

/**
 * Сохраняет событие в localStorage
 */
function saveEvent(event: TelemetryEvent) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: TelemetryEvent[] = raw ? JSON.parse(raw) : [];
    all.push(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // игнорируем, если localStorage недоступен
  }
}

/**
 * Логируем успешный роутинг интента
 */
export function logRouteTelemetry(data: {
  prompt: string;
  intent: string;
  confidence: number;
}) {
  const event: TelemetryEvent = {
    type: "route",
    prompt: data.prompt,
    intent: data.intent,
    confidence: data.confidence,
    timestamp: Date.now(),
  };
  saveEvent(event);

  // при желании можно отправить на сервер
  // fetch("/api/telemetry", { method: "POST", body: JSON.stringify(event) });
}

/**
 * Логируем неизвестный запрос (fallback)
 */
export function logUnknown(prompt: string) {
  const event: TelemetryEvent = {
    type: "unknown",
    prompt,
    timestamp: Date.now(),
  };
  saveEvent(event);

  // при желании можно отправить на сервер
  // fetch("/api/telemetry", { method: "POST", body: JSON.stringify(event) });
}

/**
 * Получить все события телеметрии
 */
export function getTelemetry(): TelemetryEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Очистить телеметрию
 */
export function clearTelemetry() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
