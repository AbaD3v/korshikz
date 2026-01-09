// /chatbot-ai/nlp.ts
import { intents, Intent } from "./intents";

/**
 * Простая функция для оценки совпадений по синонимам.
 * Возвращает число от 0 до 1 — чем выше, тем больше совпадений.
 */
export function keywordsScore(input: string, synonyms: string[]): number {
  if (!synonyms || synonyms.length === 0) return 0;

  const normalized = input.toLowerCase();
  let hits = 0;

  for (const word of synonyms) {
    if (normalized.includes(word.toLowerCase())) {
      hits++;
    }
  }

  return hits / synonyms.length;
}

/**
 * Вспомогательная функция: выбирает лучший ответ из массива responses.
 * Можно расширить логику (например, случайный выбор).
 */
export function pickResponse(responses: string[]): string {
  if (!responses || responses.length === 0) return "";
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Основная функция: ищет интент по тексту.
 * Использует RegExp patterns и оценку по synonyms.
 */
export function matchIntent(input: string): Intent | null {
  let bestIntent: Intent | null = null;
  let bestScore = 0;

  for (const intent of intents) {
    // 1. Проверка по регуляркам
    if (intent.patterns.some(p => p.test(input))) {
      return intent; // прямое совпадение — сразу возвращаем
    }

    // 2. Проверка по синонимам
    if (intent.synonyms && intent.synonyms.length > 0) {
      const score = keywordsScore(input, intent.synonyms);
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }
  }

  return bestIntent;
}
