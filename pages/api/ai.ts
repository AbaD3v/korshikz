import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ text: "Method not allowed" });
  }

  try {
    const { input, context, model } = req.body;

    // Простая заглушка для теста
    const reply = `Echo (${model ?? "default"}): ${input}`;

    return res.status(200).json({ text: reply });
  } catch (err) {
    console.error("API /api/ai error:", err);
    return res.status(500).json({ text: "Error processing request" });
  }
}
