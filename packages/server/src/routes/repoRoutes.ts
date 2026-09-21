import { Router } from "express";
import { store } from "../store.js";
import { gitManager } from "../git/gitManager.js";

export const repoRouter = Router();

// List all repositories
repoRouter.get("/", (_req, res) => {
  const repos = store.getRepositories();
  res.json({ repositories: repos });
});

// Clone a repository
repoRouter.post("/clone", async (req, res) => {
  const { url, name } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Repository URL is required" });
  }

  try {
    const repo = await gitManager.cloneRepository(url, name);
    return res.json({ repository: repo });
  } catch (err: any) {
    console.error("Clone failed:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to clone repository" });
  }
});

// Get repository details
repoRouter.get("/:id", (req, res) => {
  const repo = store.getRepository(req.params.id);
  if (!repo) {
    return res.status(404).json({ error: "Repository not found" });
  }
  return res.json({ repository: repo });
});

// Delete repository
repoRouter.delete("/:id", (req, res) => {
  store.deleteRepository(req.params.id);
  return res.json({ ok: true });
});

// List worktrees for a repository
repoRouter.get("/:id/worktrees", async (req, res) => {
  try {
    const worktrees = await gitManager.listWorktrees(req.params.id);
    return res.json({ worktrees });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to list worktrees" });
  }
});

// Create a new worktree
repoRouter.post("/:id/worktrees", async (req, res) => {
  const { branch, baseBranch } = req.body;
  if (!branch) {
    return res.status(400).json({ error: "Branch name is required" });
  }

  try {
    const worktree = await gitManager.createWorktree(
      req.params.id,
      branch,
      baseBranch,
    );
    return res.json({ worktree });
  } catch (err: any) {
    console.error("Failed to create worktree:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to create worktree" });
  }
});

// Remove a worktree
repoRouter.delete("/:id/worktrees/:wtId", async (req, res) => {
  try {
    await gitManager.removeWorktree(req.params.id, req.params.wtId);
    return res.json({ ok: true });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to remove worktree" });
  }
});

// Get Git status of a worktree
repoRouter.get("/:id/worktrees/:wtId/status", async (req, res) => {
  const wt = store.getWorktree(req.params.wtId);
  if (!wt) {
    return res.status(404).json({ error: "Worktree not found" });
  }

  try {
    const status = await gitManager.getStatus(wt.path);
    return res.json({ status });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to get git status" });
  }
});

// Get Git diff of a worktree
repoRouter.get("/:id/worktrees/:wtId/diff", async (req, res) => {
  const wt = store.getWorktree(req.params.wtId);
  if (!wt) {
    return res.status(404).json({ error: "Worktree not found" });
  }

  try {
    const file = req.query.file as string | undefined;
    const diff = await gitManager.getDiff(wt.path, file);
    return res.json({ diff });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to get diff" });
  }
});

// Commit changes
repoRouter.post("/:id/worktrees/:wtId/commit", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Commit message is required" });
  }

  const wt = store.getWorktree(req.params.wtId);
  if (!wt) {
    return res.status(404).json({ error: "Worktree not found" });
  }

  try {
    await gitManager.commit(wt.path, message);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to commit" });
  }
});

// Push changes
repoRouter.post("/:id/worktrees/:wtId/push", async (req, res) => {
  const wt = store.getWorktree(req.params.wtId);
  if (!wt) {
    return res.status(404).json({ error: "Worktree not found" });
  }

  try {
    await gitManager.push(wt.path);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to push" });
  }
});

// Get branches
repoRouter.get("/:id/branches", async (req, res) => {
  try {
    const branches = await gitManager.getBranches(req.params.id);
    return res.json({ branches });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to get branches" });
  }
});
