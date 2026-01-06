// /chatbot-ai/nlp.ts

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
  // пока берём первый, но можно сделать случайный выбор
  return responses[0];
}
