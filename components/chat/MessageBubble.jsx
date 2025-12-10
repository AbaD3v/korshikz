export default function MessageBubble({ msg, isMe }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isMe ? "flex-end" : "flex-start",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: "78%",
          padding: "10px 14px",
          borderRadius: 16,
          background: isMe ? "#DCF8C6" : "#FFFFFF",
          color: "#111",
          boxShadow: "0 1px 1px rgba(0,0,0,0.12)",
          fontSize: 15,
          position: "relative",
          lineHeight: "1.4",
          whiteSpace: "pre-wrap",
        }}
      >
        {/* Text */}
        <div>{msg.body}</div>

        {/* Time & ticks */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 4,
            gap: 6,
            fontSize: 11,
            color: "#555",
          }}
        >
          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>

          {isMe && (
            <span style={{ fontSize: 12, color: msg.read ? "#4fc3f7" : "#999" }}>
              {msg.read ? "✓✓" : "✓"}
            </span>
          )}
        </div>

        {/* WhatsApp bubble tail */}
        <div
          style={{
            content: "''",
            position: "absolute",
            bottom: 0,
            [isMe ? "right" : "left"]: -6,
            width: 0,
            height: 0,
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            borderLeft: isMe ? "none" : "6px solid #FFFFFF",
            borderRight: isMe ? "6px solid #DCF8C6" : "none",
          }}
        ></div>
      </div>
    </div>
  );
}
