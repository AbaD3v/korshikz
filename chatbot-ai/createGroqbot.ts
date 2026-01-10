// /chatbot-ai/createGroqbot.ts
"use client";

import type { StreamingProvider, BotResponse, ChatMessage } from "../chatbot/types/ChatbotTypes";
import { KORSHI_SYSTEM_PROMPT } from "./systemPrompt";

export function createGroqbot(): StreamingProvider {
  // Вспомогательная функция для приведения твоих типов сообщений к формату Groq
  const formatHistory = (history: ChatMessage[]) => {
    return history.map(msg => ({
      role: (msg.role === "ai" || msg.role === "bot") ? "assistant" : "user",
      content: msg.text
    }));
  };

  async function* stream(prompt: string, history: any = []) {
    try {
      const formattedHistory = Array.isArray(history) ? formatHistory(history) : [];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: KORSHI_SYSTEM_PROMPT },
            ...formattedHistory,
            { role: "user", content: prompt }
          ],
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) return;

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === "data: [DONE]") continue;
          if (trimmedLine.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              const content = data.choices[0]?.delta?.content;
              if (content) yield content;
            } catch (e) { continue; }
          }
        }
      }
    } catch (error) {
      console.error("Groq stream error:", error);
      yield "Ошибка связи с ИИ.";
    }
  }

  async function send(prompt: string, history: any = []): Promise<BotResponse> {
    let fullText = "";
    for await (const chunk of stream(prompt, history)) {
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