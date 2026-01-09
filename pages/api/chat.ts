import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing or invalid prompt" });
    }

    const hfRes = await fetch(
      "https://hf.space/embed/AbaD3v/korshikz-chatbot/api/predict",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [prompt] }),
      }
    );

    if (!hfRes.ok) {
      const text = await hfRes.text();
      console.error("HF error:", text);
      return res.status(500).json({ error: "HF Space request failed", details: text });
    }

    const data = await hfRes.json();
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("API /chat error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}
