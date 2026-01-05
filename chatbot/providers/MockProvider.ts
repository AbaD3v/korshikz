import type { ResponseProvider, ChatMessage } from "../types/ChatbotTypes";

export class MockProvider implements ResponseProvider {
  async getResponse(input: string, context: ChatMessage[]): Promise<string> {
    return `Mock reply: ${input}`;
  }
}
