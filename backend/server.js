import express from "express";
import http from "http";
import { Server as IOServer } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./src/db.js";
import apiRouter from "./src/routes/index.js";
import { initRealtime } from "./src/ws.js";

dotenv.config();
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

// health
app.get("/", (req, res) => res.send("Korshi.kz backend (Render) — OK"));

// API
app.use("/api", apiRouter);

// HTTP + socket.io
const server = http.createServer(app);
const io = new IOServer(server, {
  cors: { origin: "*" },
});

// initialize websocket handlers
initRealtime(io);

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
