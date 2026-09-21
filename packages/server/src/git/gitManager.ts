import path from "node:path";
import fs from "node:fs";
import { simpleGit, SimpleGit } from "simple-git";
import {
  Repository,
  Worktree,
  GitStatusSummary,
  GitFileStatus,
} from "@shiba-code/shared";
import { config } from "../config.js";
import { store } from "../store.js";

export class GitManager {
  private getRepoRoot(repoId: string): string {
    return path.join(config.reposDir, repoId);
  }

  private getMainPath(repoId: string): string {
    return path.join(this.getRepoRoot(repoId), "main");
  }

  private getWorktreesDir(repoId: string): string {
    return path.join(this.getRepoRoot(repoId), "worktrees");
  }

  async cloneRepository(url: string, customName?: string): Promise<Repository> {
    const rawName = customName || path.basename(url, ".git") || "repo";
    const cleanName = rawName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const repoId = `${cleanName}-${Date.now().toString(36)}`;
    const repoRoot = this.getRepoRoot(repoId);
    const mainPath = this.getMainPath(repoId);
    const worktreesDir = this.getWorktreesDir(repoId);

    fs.mkdirSync(worktreesDir, { recursive: true });

    // Clone into 'main' directory
    const git = simpleGit();
    await git.clone(url, mainPath);

    const mainGit = simpleGit(mainPath);
    const branchSummary = await mainGit.branch();
    const defaultBranch = branchSummary.current || "main";

    const repo: Repository = {
      id: repoId,
      name: cleanName,
      url,
      localPath: mainPath,
      defaultBranch,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.saveRepository(repo);

    // Also register the main worktree
    const mainWorktree: Worktree = {
      id: `${repoId}-main`,
      repoId,
      branch: defaultBranch,
      path: mainPath,
      isMain: true,
      createdAt: new Date().toISOString(),
    };
    store.saveWorktree(mainWorktree);

    return repo;
  }

  async createWorktree(
    repoId: string,
    branchName: string,
    baseBranch?: string,
  ): Promise<Worktree> {
    const repo = store.getRepository(repoId);
    if (!repo) {
      throw new Error(`Repository not found: ${repoId}`);
    }

    const mainPath = this.getMainPath(repoId);
    const cleanBranch = branchName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const worktreeId = `wt-${cleanBranch}-${Date.now().toString(36)}`;
    const worktreePath = path.join(this.getWorktreesDir(repoId), worktreeId);

    const mainGit = simpleGit(mainPath);

    // Check if branch already exists in local or remote
    const branchSummary = await mainGit.branch(["-a"]);
    const branchExists =
      branchSummary.all.includes(branchName) ||
      branchSummary.all.includes(`remotes/origin/${branchName}`);

    if (branchExists) {
      // Add worktree checking out existing branch
      await mainGit.raw(["worktree", "add", worktreePath, branchName]);
    } else {
      // Create new branch from base branch
      const startPoint = baseBranch || repo.defaultBranch;
      await mainGit.raw([
        "worktree",
        "add",
        "-b",
        branchName,
        worktreePath,
        startPoint,
      ]);
    }

    const worktree: Worktree = {
      id: worktreeId,
      repoId,
      branch: branchName,
      path: worktreePath,
      isMain: false,
      createdAt: new Date().toISOString(),
    };
    store.saveWorktree(worktree);

    return worktree;
  }

  async listWorktrees(repoId: string): Promise<Worktree[]> {
    const repo = store.getRepository(repoId);
    if (!repo) {
      throw new Error(`Repository not found: ${repoId}`);
    }

    const mainPath = this.getMainPath(repoId);
    const mainGit = simpleGit(mainPath);

    // Sync with git worktree list porcelain
    try {
      const output = await mainGit.raw(["worktree", "list", "--porcelain"]);
      const entries = output.split("\n\n").filter(Boolean);

      const activePaths = new Set<string>();
      for (const entry of entries) {
        const lines = entry.split("\n");
        for (const line of lines) {
          if (line.startsWith("worktree ")) {
            activePaths.add(
              path.normalize(line.replace("worktree ", "").trim()),
            );
          }
        }
      }

      // Check stored worktrees and remove invalid ones
      const stored = store.getWorktrees(repoId);
      for (const wt of stored) {
        if (!wt.isMain && !activePaths.has(path.normalize(wt.path))) {
          store.deleteWorktree(wt.id);
        }
      }
    } catch (err) {
      console.warn("Could not sync worktree list from git:", err);
    }

    return store.getWorktrees(repoId);
  }

  async removeWorktree(repoId: string, worktreeId: string): Promise<void> {
    const wt = store.getWorktree(worktreeId);
    if (!wt) {
      throw new Error(`Worktree not found: ${worktreeId}`);
    }
    if (wt.isMain) {
      throw new Error("Cannot remove main worktree");
    }

    const mainPath = this.getMainPath(repoId);
    const mainGit = simpleGit(mainPath);

    try {
      await mainGit.raw(["worktree", "remove", "--force", wt.path]);
    } catch (err) {
      console.warn(
        `Failed to git worktree remove, trying directory removal:`,
        err,
      );
    }

    // Ensure directory is deleted
    if (fs.existsSync(wt.path)) {
      fs.rmSync(wt.path, { recursive: true, force: true });
    }

    store.deleteWorktree(worktreeId);
  }

  async getStatus(worktreePath: string): Promise<GitStatusSummary> {
    const git = simpleGit(worktreePath);
    const status = await git.status();

    const files: GitFileStatus[] = [];

    for (const f of status.modified) {
      files.push({ path: f, status: "modified", staged: false });
    }
    for (const f of status.created) {
      files.push({ path: f, status: "added", staged: false });
    }
    for (const f of status.deleted) {
      files.push({ path: f, status: "deleted", staged: false });
    }
    for (const f of status.not_added) {
      files.push({ path: f, status: "untracked", staged: false });
    }

    return {
      branch: status.current || "unknown",
      ahead: status.ahead,
      behind: status.behind,
      isClean: status.isClean(),
      files,
    };
  }

  async getDiff(worktreePath: string, filePath?: string): Promise<string> {
    const git = simpleGit(worktreePath);
    if (filePath) {
      return await git.diff([filePath]);
    }
    const unstaged = await git.diff();
    const staged = await git.diff(["--cached"]);
    return `${staged}\n${unstaged}`.trim();
  }

  async commit(worktreePath: string, message: string): Promise<void> {
    const git = simpleGit(worktreePath);
    await git.add(["-A"]);
    await git.commit(message);
  }

  async push(worktreePath: string): Promise<void> {
    const git = simpleGit(worktreePath);
    const status = await git.status();
    const branch = status.current;
    if (!branch) {
      throw new Error("Cannot push detached HEAD");
    }
    await git.push("origin", branch, ["--set-upstream"]);
  }

  async getBranches(repoId: string): Promise<string[]> {
    const mainPath = this.getMainPath(repoId);
    const git = simpleGit(mainPath);
    const branchSummary = await git.branch(["-a"]);
    return branchSummary.all;
  }
}

export const gitManager = new GitManager();
