import { useState } from "react";

export default function ImprovedChatUI() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, body: "Привет!", isMe: false },
    { id: 2, body: "Как дела?", isMe: true },
  ]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { id: Date.now(), body: input, isMe: true }]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-4">
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.map((msg) => (
          <MessageBubble
  key={msg.id}
  msg={{
    ...msg,
    read: msg.metadata?.read_by?.includes(otherUserId) ?? false,
  }}
  isMe={msg.sender_id === user?.id}
/>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <input
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 shadow-sm focus:outline-none"
          placeholder="Сообщение..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="px-5 py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
