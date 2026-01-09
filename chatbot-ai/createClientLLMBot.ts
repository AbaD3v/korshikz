"use client";

import type { StreamingProvider, BotResponse } from "../chatbot/types/ChatbotTypes";
import { KORSHI_SYSTEM_PROMPT } from "./systemPrompt";

let loadingProgress = 0;
let isModelLoaded = false;

export const getModelProgress = () => loadingProgress;
export const getIsModelLoaded = () => isModelLoaded;

export function createClientLLMBot(): StreamingProvider {
  let worker: Worker | null = null;

  const initWorker = () => {
    if (!worker) {
      worker = new Worker(new URL("./worker.ts", import.meta.url));
    }
    return worker;
  };

  async function* stream(prompt: string) {
    const aiWorker = initWorker();
    const queue: string[] = [];
    let isDone = false;

    aiWorker.onmessage = (e) => {
      const { status, progress, output, error } = e.data;
      if (status === "loading") loadingProgress = Math.round(progress);
      if (status === "ready") { isModelLoaded = true; loadingProgress = 100; }
      if (status === "update" && output) queue.push(output);
      if (status === "complete") isDone = true;
      if (status === "error") isDone = true;
    };


aiWorker.postMessage({ 
  text: prompt, 
  systemPrompt: "Ты помощник на сайте Korshi.kz. Отвечай дружелюбно и по делу на русском языке. Не отвечай больше 20 слов."
});

    while (!isDone || queue.length > 0) {
      if (queue.length > 0) {
        yield queue.shift()!;
      } else {
        await new Promise((r) => setTimeout(r, 20));
      }
    }
  }

  async function send(prompt: string): Promise<BotResponse> {
    let fullText = "";
    for await (const chunk of stream(prompt)) {
      fullText += chunk;
    }
    return { 
      text: fullText.trim(), 
      intent: "llm_generated", 
      confidence: 1.0 
    };
  }

  return { send, stream };
}