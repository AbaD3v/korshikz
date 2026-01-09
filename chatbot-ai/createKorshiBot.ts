// /chatbot-ai/createKorshiBot.ts
import { smartStreamingRouter } from "./router";
import type { StreamingProvider } from "../chatbot/types/ChatbotTypes";

export function createKorshiBot(): StreamingProvider {
  // Теперь KorshiBot — это и есть наш роутер с поддержкой интентов и LLM
  return smartStreamingRouter;
}