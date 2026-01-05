import type { ResponseProvider, ChatMessage } from "../types/ChatbotTypes";

interface AIOptions {
  apiUrl: string;
  apiKey?: string;
  model?: string;
}

export class AIProvider implements ResponseProvider {
  constructor(private opts: AIOptions) {}

  async getResponse(input: string, context: ChatMessage[]): Promise<string> {
    const res = await fetch(this.opts.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.opts.apiKey ? { Authorization: `Bearer ${this.opts.apiKey}` } : {}),
      },
      body: JSON.stringify({ input, context, model: this.opts.model ?? "gpt-3.5-turbo" }),
    });

    if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
    const data = await res.json();
    return data.text;
  }
}
