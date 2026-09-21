import { Router } from "express";
import { GitHubRepoItem } from "@shiba-code/shared";
import { store } from "../store.js";
import { gitManager } from "../git/gitManager.js";
import { config } from "../config.js";

export const repoRouter = Router();

// List all repositories
repoRouter.get("/", (_req, res) => {
  const repos = store.getRepositories();
  res.json({ repositories: repos });
});

// List GitHub repositories for authenticated user
repoRouter.get("/github", async (_req, res) => {
  const token = store.getGitHubAuth()?.accessToken || config.githubToken;
  if (!token) {
    return res.status(401).json({
      error:
        "GitHub is not connected. Please connect your GitHub account or provide a token.",
    });
  }

  try {
    const ghRes = await fetch(
      "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Shiba-Code",
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!ghRes.ok) {
      const err = (await ghRes.json().catch(() => null)) as any;
      return res.status(ghRes.status).json({
        error: err?.message || "Failed to fetch GitHub repositories",
      });
    }

    const items = (await ghRes.json()) as any[];
    const repositories: GitHubRepoItem[] = items.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      private: Boolean(r.private),
      htmlUrl: r.html_url,
      cloneUrl: r.clone_url,
      defaultBranch: r.default_branch || "main",
      description: r.description || undefined,
      updatedAt: r.updated_at,
    }));

    return res.json({ repositories });
  } catch (err: any) {
    console.error("Failed to fetch GitHub repositories:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to fetch GitHub repositories" });
  }
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
