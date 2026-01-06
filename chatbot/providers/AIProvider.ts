// chatbot/providers/AIProvider.ts
import type { ResponseProvider, ChatMessage, BotResponse } from "../types/ChatbotTypes";

interface AIOptions {
  apiUrl: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  retries?: number;
  // опциональный хук для телеметрии (можешь заменить на реальный логгер)
  onTelemetry?: (event: { type: string; payload?: any }) => void;
}

const DEFAULT_TIMEOUT = 8000;
const DEFAULT_RETRIES = 1;

export class AIProvider implements ResponseProvider {
  private timeoutMs: number;
  private retries: number;
  private onTelemetry?: (event: { type: string; payload?: any }) => void;

  constructor(private opts: AIOptions) {
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT;
    this.retries = opts.retries ?? DEFAULT_RETRIES;
    this.onTelemetry = opts.onTelemetry;
  }

  private telemetry(type: string, payload?: any) {
    try {
      this.onTelemetry?.({ type, payload });
    } catch {
      // noop
    }
  }

  private async fetchWithTimeout(input: string, context: ChatMessage[], signal: AbortSignal) {
    const body = JSON.stringify({
      input,
      context,
      model: this.opts.model ?? "gpt-3.5-turbo",
    });

    const res = await fetch(this.opts.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.opts.apiKey ? { Authorization: `Bearer ${this.opts.apiKey}` } : {}),
      },
      body,
      signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI request failed: ${res.status} ${res.statusText} ${text}`);
    }

    // Попробуем распарсить JSON; если не JSON — вернём текст
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return res.json();
    }
    return { text: await res.text() };
  }

  // Основной метод: возвращает BotResponse
  async getResponse(input: string, context: ChatMessage[]): Promise<BotResponse> {
    this.telemetry("request:start", { input, contextLength: context.length });

    let lastErr: unknown = null;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const raw = await this.fetchWithTimeout(input, context, controller.signal);
        clearTimeout(timeout);

        // Нормализуем ответ в BotResponse
        const resp: BotResponse =
          raw && typeof raw === "object" && "text" in raw
            ? {
                text: String((raw as any).text ?? ""),
                links: (raw as any).links,
                intent: (raw as any).intent,
                confidence: typeof (raw as any).confidence === "number" ? (raw as any).confidence : undefined,
              }
            : { text: String(raw ?? ""), confidence: 1 };

        this.telemetry("request:success", { input, intent: resp.intent, confidence: resp.confidence });
        return resp;
      } catch (err) {
        clearTimeout(timeout);
        lastErr = err;
        this.telemetry("request:error", { input, attempt, error: String((err as any)?.message ?? err) });

        // если это был abort (timeout), пометим отдельно
        if ((err as any)?.name === "AbortError") {
          this.telemetry("request:timeout", { input, attempt });
        }

        // если последняя попытка — пробрасываем дальше после fallback
        if (attempt === this.retries) break;

        // небольшая задержка перед retry
        await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
      }
    }

    // fallback-ответ при ошибке
    const fallback: BotResponse = {
      text:
        "Извини, сейчас временные трудности с обработкой запроса. Попробуй повторить чуть позже или обратись в поддержку.",
      intent: "provider_error_fallback",
      confidence: 0,
      links: [{ label: "Поддержка", href: "/support" }],
    };

    this.telemetry("request:fallback", { input, error: String(lastErr ?? "unknown") });
    return fallback;
  }

  // Простой стриминг: разбивает финальный текст на чанки (UI может подписаться на генератор)
  async *streamResponse(input: string, context: ChatMessage[], chunkSize = 40): AsyncGenerator<string, void, void> {
    const resp = await this.getResponse(input, context);
    const text = resp.text ?? "";
    for (let i = 0; i < text.length; i += chunkSize) {
      yield text.slice(i, i + chunkSize);
      // имитация небольшого интервала между чанками
      await new Promise(r => setTimeout(r, 20));
    }
  }
}
