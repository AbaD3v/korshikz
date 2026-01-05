export interface ChatMessage {
  role: "user" | "bot";
  text: string;
  timestamp?: number;
}

export interface ResponseProvider {
  getResponse(input: string, context: ChatMessage[]): Promise<string>;
}

export interface ContextStorePort {
  add(message: ChatMessage): void;
  getAll(): ChatMessage[];
}

export interface ChatbotConfig {
  provider?: ResponseProvider;
  onMessage?: (msg: ChatMessage) => void;
  contextStore?: ContextStorePort;
}
