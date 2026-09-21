import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { setupWebSocketServer } from "./ws/wsServer.js";
import { authRouter } from "./routes/authRoutes.js";
import { repoRouter } from "./routes/repoRoutes.js";
import { agentRouter } from "./routes/agentRoutes.js";
import { authMiddleware } from "./auth/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, "../../client/dist");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Auth endpoints (open)
app.use("/api/auth", authRouter);

// Protected endpoints
app.use("/api/repositories", authMiddleware, repoRouter);
app.use("/api/agents", authMiddleware, agentRouter);

// Serve frontend build if available
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const server = http.createServer(app);

// Attach WebSocket server
setupWebSocketServer(server);

server.listen(config.port, config.host, () => {
  console.log(
    `[Shiba Code Server] Running on http://${config.host}:${config.port}`,
  );
  console.log(`[Shiba Code Server] Data directory: ${config.dataDir}`);
});
