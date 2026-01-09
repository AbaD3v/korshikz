// chatbot-ai/decision.ts
import type { Intent } from "./intents";

export type Decision =
  | {
      action: "template";
      intent: Intent;
      confidence: number;
    }
  | {
      action: "client_llm";
      intent?: Intent;
      confidence: number;
    }
  | {
      action: "fallback";
    };

export function decide(params: {
  intent?: Intent;
  confidence?: number;
  deviceIsWeak: boolean;
}): Decision {
  const { intent, confidence = 0, deviceIsWeak } = params;

  // Нет интента
  if (!intent) {
    return deviceIsWeak
      ? { action: "fallback" }
      : { action: "client_llm", confidence: 0 };
  }

  // Static — всегда шаблон
  if (intent.responseStrategy === "static") {
    return { action: "template", intent, confidence };
  }

  // Dynamic, но слабое устройство
  if (intent.responseStrategy === "dynamic" && deviceIsWeak) {
    return { action: "template", intent, confidence };
  }

  // Dynamic + высокая уверенность
  if (intent.responseStrategy === "dynamic" && confidence >= 0.6) {
    return { action: "client_llm", intent, confidence };
  }

  // Остальное — шаблон
  return { action: "template", intent, confidence };
}
