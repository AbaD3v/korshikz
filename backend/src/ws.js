import { supabaseAdmin } from "./supabaseAdmin.js";

export function initRealtime(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || (socket.handshake.headers?.authorization || "").split(" ")[1];
      if (!token) return next(new Error("Missing token"));
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data?.user) return next(new Error("Auth failed"));
      socket.user = data.user;
      return next();
    } catch (err) {
      console.error("socket auth error", err);
      return next(new Error("Auth error"));
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.user.id;
    socket.join(`user:${uid}`); // personal room

    socket.on("joinRoom", (roomId) => {
      socket.join(`room:${roomId}`);
    });

    socket.on("leaveRoom", (roomId) => {
      socket.leave(`room:${roomId}`);
    });

    socket.on("sendMessage", (payload) => {
      // payload: { roomId, text, metadata }
      const room = `room:${payload.roomId}`;
      io.to(room).emit("message", {
        ...payload,
        from: socket.user.id,
        created_at: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      // handle disconnect if needed
    });
  });

  console.log("Socket.IO initialized");
}
