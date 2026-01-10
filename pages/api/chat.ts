// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { messages } = req.body;
  const GROQ_API_KEY = process.env.GROQ_API_KEY; // Ключ берем из переменных окружения

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.7,
        stream: true,
      }),
    });

    // Настраиваем заголовки для стриминга
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body?.getReader();
    if (!reader) return res.status(500).end();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value); // Передаем чанки данных напрямую клиенту
    }
    res.end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Groq' });
  }
}