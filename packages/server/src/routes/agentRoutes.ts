import { Router } from "express";
import { store } from "../store.js";
import { sessionManager } from "../agent/sessionManager.js";
import { AgentType } from "@shiba-code/shared";

export const agentRouter = Router();

// List sessions
agentRouter.get("/sessions", (req, res) => {
  const worktreeId = req.query.worktreeId as string | undefined;
  const sessions = store.getSessions(worktreeId);
  return res.json({ sessions });
});

// Create or get session for a worktree
agentRouter.post("/sessions", (req, res) => {
  const { worktreeId, repoId, agentType, command, args } = req.body;
  if (!worktreeId || !repoId) {
    return res
      .status(400)
      .json({ error: "worktreeId and repoId are required" });
  }

  const instance = sessionManager.getOrCreateSession(
    worktreeId,
    repoId,
    (agentType as AgentType) || "agy",
    command || "",
    args || [],
  );

  return res.json({ session: instance.session });
});

// Start session
agentRouter.post("/sessions/:id/start", async (req, res) => {
  const session = store.getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const wt = store.getWorktree(session.worktreeId);
  if (!wt) {
    return res.status(404).json({ error: "Worktree not found" });
  }

  const instance = sessionManager.getOrCreateSession(
    session.worktreeId,
    session.repoId,
    session.agentType,
    session.command,
    session.args,
  );

  try {
    await instance.start(wt.path);
    return res.json({ session: instance.session });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to start session" });
  }
});

// Kill session
agentRouter.post("/sessions/:id/kill", (req, res) => {
  sessionManager.killSession(req.params.id);
  const session = store.getSession(req.params.id);
  return res.json({ session });
});
