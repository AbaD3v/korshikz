// /chatbot/core/ChatbotCore.ts
import type { ChatMessage, ResponseProvider, ContextStorePort, BotResponse } from "../types/ChatbotTypes";
import { makeFallback } from "../../chatbot-ai/responseTemplates";

interface CoreOptions {
  provider: ResponseProvider;
  contextStore?: ContextStorePort;
}

type Listener = (msg: ChatMessage) => void;
type ErrorListener = (err: Error) => void;

const CONFIDENCE_THRESHOLD = 0.45;

export class ChatbotCore {
  private messages: ChatMessage[] = [];
  private listeners: Listener[] = [];
  private errorListeners: ErrorListener[] = [];

  constructor(private opts: CoreOptions) {
    if (opts.contextStore && typeof opts.contextStore.getAll === "function") {
      (async () => {
        try {
          const all = await opts.contextStore!.getAll!();
          if (all && typeof all === "object") {
            const loaded: ChatMessage[] = Object.values(all).map((v) => {
              const msg = v as unknown as ChatMessage;
              return {
                id: msg.id ?? crypto.randomUUID(),
                role: msg.role ?? "system",
                text: msg.text ?? "",
                timestamp: msg.timestamp ?? Date.now(),
                intent: msg.intent,
                confidence: msg.confidence,
                links: msg.links,
                quickReplies: msg.quickReplies,
                partial: msg.partial,
              };
            });
            this.messages = loaded;
          }
        } catch {
          // ignore load errors
        }
      })();
    }
  }

  async sendMessage(text: string) {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: Date.now(),
    };
    this.addMessage(userMsg);

    try {
      const resp = await this.opts.provider.getResponse(text, this.messages);

      // Normalize to BotResponse
      const normalized: BotResponse = typeof resp === "string" ? { text: resp, confidence: 1 } : resp;

      const confidence = typeof normalized.confidence === "number" ? normalized.confidence : 0.5;

      // Default final values from provider
      let finalText = normalized.text;
      let finalIntent = normalized.intent;
      let finalLinks = normalized.links;
      let finalQuickReplies = normalized.quickReplies;
      let finalConfidence = confidence;

      if (confidence < CONFIDENCE_THRESHOLD) {
        // Log low-confidence case for analysis (localStorage fallback for dev)
        try {
          const key = "bot_low_confidence_log";
          const prev = JSON.parse(localStorage.getItem(key) || "[]");
          prev.push({ ts: Date.now(), input: text, resp: normalized });
          localStorage.setItem(key, JSON.stringify(prev.slice(-1000)));
        } catch {
          // ignore storage errors
        }

        console.warn("Low confidence response detected", { input: text, confidence, normalized });

        // используем makeFallback вместо chooseFallback
        const fb = makeFallback();
        finalText = fb.text;
        finalIntent = fb.intent ?? "fallback";
        finalLinks = fb.links ?? [];
        finalQuickReplies = fb.quickReplies ?? ["Переформулировать", "Показать похожие темы", "Связаться с поддержкой"];
        finalConfidence = 0;
      }

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        text: finalText,
        timestamp: Date.now(),
        intent: finalIntent,
        confidence: finalConfidence,
        links: finalLinks,
        quickReplies: finalQuickReplies,
      };

      if (!this.messages.some((m) => m.role === "ai" && m.text === botMsg.text)) {
        this.addMessage(botMsg);
      }
    } catch (err) {
      this.errorListeners.forEach((cb) => cb(err as Error));
    }
  }

  onMessage(cb: Listener) {
    this.listeners.push(cb);
  }

  onError(cb: ErrorListener) {
    this.errorListeners.push(cb);
  }

  getMessages() {
    return [...this.messages];
  }

  private addMessage(msg: ChatMessage) {
    try {
      if (this.opts.contextStore && typeof this.opts.contextStore.set === "function") {
        void this.opts.contextStore.set(msg.id, msg as unknown as Record<string, unknown>);
      }
    } catch {
      // ignore storage errors
    }

    this.messages.push(msg);
    this.listeners.forEach((l) => l(msg));
  }
}
