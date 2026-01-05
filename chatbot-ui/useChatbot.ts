import { useContext } from "react";
import { ChatbotContext } from "./ChatbotProvider";

export function useChatbot() {
  const ctx = useContext(ChatbotContext);
  if (!ctx) throw new Error("ChatbotProvider missing");
  return ctx;
}
