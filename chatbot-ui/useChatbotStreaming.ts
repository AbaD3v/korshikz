"use client";

import { useMemo } from "react";
import { useChatbot } from "./ChatbotProvider";

export default function useChatbotStreaming() {
  const { messages, isStreaming, sendMessage } = useChatbot();

  const streamingMessage = useMemo(() => {
    if (!messages?.length) return null;

    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "ai" && m.partial) {
        return m;
      }
    }

    return null;
  }, [messages]);

  const lastAiMessage = useMemo(() => {
    if (!messages?.length) return null;

    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "ai") return m;
    }

    return null;
  }, [messages]);

  return {
    partial: streamingMessage?.text ?? "",
    partialMessage: streamingMessage,
    lastAiMessage,
    isStreaming: Boolean(isStreaming),
    sendMessage,
  };
}