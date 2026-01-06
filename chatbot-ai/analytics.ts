// /chatbot-ai/analytics.ts
import { getTelemetry } from "./telemetry";

export type AnalyticsReport = {
  totalEvents: number;
  topIntents: { intent: string; count: number }[];
  fallbackCount: number;
  fallbackRate: number; // процент
};

export function buildAnalyticsReport(): AnalyticsReport {
  const events = getTelemetry();
  const totalEvents = events.length;

  const intentCounts: Record<string, number> = {};
  let fallbackCount = 0;

  for (const ev of events) {
    if (ev.type === "route" && ev.intent) {
      intentCounts[ev.intent] = (intentCounts[ev.intent] || 0) + 1;
    } else if (ev.type === "unknown") {
      fallbackCount++;
    }
  }

  const topIntents = Object.entries(intentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([intent, count]) => ({ intent, count }));

  return {
    totalEvents,
    topIntents,
    fallbackCount,
    fallbackRate: totalEvents > 0 ? fallbackCount / totalEvents : 0,
  };
}
