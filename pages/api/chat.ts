// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

let gemini: any = null;

async function getGemini() {
  if (!gemini) {
    const { GoogleGenAI } = await import("@google/genai");
    gemini = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return gemini;
}

function normalizeText(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item) {
          return String((item as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("\n");
  }

  return "";
}

function toSSE(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function parseMessages(rawMessages: any[]): ChatMessage[] {
  return rawMessages
    .map((msg: any) => ({
      role: msg?.role,
      content: normalizeText(msg?.content),
    }))
    .filter(
      (msg: ChatMessage) =>
        ["system", "user", "assistant"].includes(msg.role) &&
        msg.content.trim().length > 0
    ) as ChatMessage[];
}

async function streamWithGemini(messages: ChatMessage[], res: NextApiResponse) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const geminiInstance = await getGemini();

  const systemMessage =
    messages.find((m) => m.role === "system")?.content ?? "";

  const nonSystemMessages = messages.filter((m) => m.role !== "system");
  const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];

  if (!lastMessage || lastMessage.role !== "user") {
    throw new Error("Последнее сообщение должно быть от пользователя.");
  }

  const history = nonSystemMessages.slice(0, -1).map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const chat = geminiInstance.chats.create({
    model: "gemini-2.5-flash",
    history,
    config: {
      systemInstruction: systemMessage || undefined,
      temperature: 0.7,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  });

  const stream = await chat.sendMessageStream({
    message: lastMessage.content,
  });

  for await (const chunk of stream) {
    const text = chunk.text ?? "";
    if (!text) continue;

    res.write(
      toSSE({
        id: "gemini-chatcmpl",
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: "gemini-2.5-flash",
        provider: "gemini",
        choices: [
          {
            index: 0,
            delta: {
              content: text,
            },
            finish_reason: null,
          },
        ],
      })
    );
  }

  res.write(
    toSSE({
      id: "gemini-chatcmpl",
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: "gemini-2.5-flash",
      provider: "gemini",
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: "stop",
        },
      ],
    })
  );
}

async function streamWithGroq(messages: ChatMessage[], res: NextApiResponse) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Groq API error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Groq response reader unavailable");
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
}

function isGeminiRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  return (
    lower.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("quota") ||
    lower.includes("resource exhausted")
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = parseMessages(rawMessages);

  if (messages.length === 0) {
    return res.status(400).json({ error: "messages is required" });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  try {
    await streamWithGemini(messages, res);
    res.write("data: [DONE]\n\n");
    return res.end();
  } catch (geminiError) {
    console.error("Gemini error, switching to Groq fallback:", geminiError);

    const canFallback =
      !!process.env.GROQ_API_KEY &&
      (isGeminiRateLimitError(geminiError) || true);

    if (!canFallback) {
      if (!res.writableEnded) {
        return res.status(500).json({
          error: "Ошибка Gemini, fallback недоступен.",
          details:
            geminiError instanceof Error ? geminiError.message : String(geminiError),
        });
      }
      return;
    }

    try {
      await streamWithGroq(messages, res);
      return res.end();
    } catch (groqError) {
      console.error("Groq fallback error:", groqError);

      if (!res.writableEnded) {
        return res.status(500).json({
          error: "Ошибка и в Gemini, и в Groq.",
          gemini:
            geminiError instanceof Error ? geminiError.message : String(geminiError),
          groq: groqError instanceof Error ? groqError.message : String(groqError),
        });
      }
    }
  }
}