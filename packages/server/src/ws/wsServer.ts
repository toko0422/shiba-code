import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { WSClientMessage, WSServerMessage } from "@shiba-code/shared";
import { sessionManager } from "../agent/sessionManager.js";
import { store } from "../store.js";

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    let currentSessionId: string | null = null;
    let dataListener: ((data: string) => void) | null = null;
    let exitListener: ((code: number) => void) | null = null;

    const cleanupCurrentSubscription = () => {
      if (currentSessionId && dataListener) {
        const instance = sessionManager.getInstance(currentSessionId);
        if (instance) {
          if (dataListener) instance.off("data", dataListener);
          if (exitListener) instance.off("exit", exitListener);
        }
      }
      currentSessionId = null;
      dataListener = null;
      exitListener = null;
    };

    ws.on("message", async (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString("utf-8")) as WSClientMessage;

        if (msg.type === "session:subscribe") {
          cleanupCurrentSubscription();
          currentSessionId = msg.sessionId;

          let instance = sessionManager.getInstance(msg.sessionId);
          if (!instance) {
            const session = store.getSession(msg.sessionId);
            if (session) {
              instance = sessionManager.getOrCreateSession(
                session.worktreeId,
                session.repoId,
                session.agentType,
                session.command,
                session.args,
              );
            }
          }

          if (instance) {
            // Send existing buffer
            const buffer = instance.getBuffer();
            if (buffer) {
              const outMsg: WSServerMessage = {
                type: "terminal:output",
                sessionId: msg.sessionId,
                data: buffer,
              };
              ws.send(JSON.stringify(outMsg));
            }

            // Listen for new output
            dataListener = (data: string) => {
              if (ws.readyState === WebSocket.OPEN) {
                const outMsg: WSServerMessage = {
                  type: "terminal:output",
                  sessionId: msg.sessionId,
                  data,
                };
                ws.send(JSON.stringify(outMsg));
              }
            };
            instance.on("data", dataListener);

            exitListener = (code: number) => {
              if (ws.readyState === WebSocket.OPEN) {
                const exitMsg: WSServerMessage = {
                  type: "terminal:exit",
                  sessionId: msg.sessionId,
                  exitCode: code,
                };
                ws.send(JSON.stringify(exitMsg));
              }
            };
            instance.on("exit", exitListener);

            // Send current status
            const statusMsg: WSServerMessage = {
              type: "session:status",
              session: instance.session,
            };
            ws.send(JSON.stringify(statusMsg));
          }
        } else if (msg.type === "terminal:start") {
          const session = store.getSession(msg.sessionId);
          if (session) {
            const wt = store.getWorktree(session.worktreeId);
            if (wt) {
              const instance = sessionManager.getOrCreateSession(
                session.worktreeId,
                session.repoId,
                session.agentType,
                session.command,
                session.args,
              );
              await instance.start(wt.path);
            }
          }
        } else if (msg.type === "terminal:input") {
          const instance = sessionManager.getInstance(msg.sessionId);
          if (instance) {
            instance.write(msg.data);
          }
        } else if (msg.type === "terminal:resize") {
          const instance = sessionManager.getInstance(msg.sessionId);
          if (instance) {
            instance.resize(msg.cols, msg.rows);
          }
        } else if (msg.type === "terminal:kill") {
          sessionManager.killSession(msg.sessionId);
        }
      } catch (err: any) {
        console.error("WebSocket message handling error:", err);
        const errMsg: WSServerMessage = {
          type: "error",
          message: err.message || "Internal server error",
        };
        ws.send(JSON.stringify(errMsg));
      }
    });

    ws.on("close", () => {
      cleanupCurrentSubscription();
    });
  });

  return wss;
}
