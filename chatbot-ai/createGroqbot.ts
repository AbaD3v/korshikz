// /chatbot-ai/createGroqbot.ts
"use client";

import type { StreamingProvider, BotResponse, ChatMessage } from "../chatbot/types/ChatbotTypes";
import { KORSHI_SYSTEM_PROMPT } from "./systemPrompt";

export function createGroqbot(): StreamingProvider {
  const formatHistory = (history: any[]) => {
    return history
      .filter(msg => msg && (msg.text || msg.content)) // Проверка на наличие данных
      .map(msg => ({
        // Учитываем и 'ai', и 'bot', и 'assistant'
        role: (msg.role === "ai" || msg.role === "bot" || msg.role === "assistant") 
          ? "assistant" 
          : "user",
        // Учитываем и 'text', и 'content' (для надежности)
        content: msg.text || msg.content || ""
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server error details:", errorData);
        if (response.status === 429) {
          yield "Слишком много запросов. Пожалуйста, подождите минуту.";
        } else {
          yield `Ошибка связи (${response.status}). Попробуйте позже.`;
        }
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) {
        yield "Ошибка: поток данных не доступен.";
        return;
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
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
      console.error("Groq stream fatal error:", error);
      yield "Произошла сетевая ошибка. Проверьте подключение.";
    }
  }

  async function send(prompt: string, history: any = []): Promise<BotResponse> {
    let fullText = "";
    try {
      for await (const chunk of stream(prompt, history)) {
        fullText += chunk;
      }
      return { 
        text: fullText.trim() || "Извините, я не смог сформировать ответ.", 
        intent: "llm_generated", 
        confidence: 1.0 
      };
    } catch (err) {
      return { text: "Ошибка при получении ответа.", intent: "error", confidence: 0 };
    }
  }

  return { send, stream };
}