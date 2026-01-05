export function getChatbotStorageKey(id = "default") {
  return `chatbot:context:${id}`;
}
