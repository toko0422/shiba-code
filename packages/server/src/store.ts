import fs from "node:fs";
import path from "node:path";
import { Repository, Worktree, AgentSession } from "@shiba-code/shared";
import { config } from "./config.js";

interface DatabaseSchema {
  repositories: Repository[];
  worktrees: Worktree[];
  sessions: AgentSession[];
}

const defaultData: DatabaseSchema = {
  repositories: [],
  worktrees: [],
  sessions: [],
};

class Store {
  private filePath: string;
  private data: DatabaseSchema;

  constructor() {
    this.filePath = config.dbPath;
    this.data = defaultData;
    this.init();
  }

  private init() {
    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }
    if (!fs.existsSync(config.reposDir)) {
      fs.mkdirSync(config.reposDir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const content = fs.readFileSync(this.filePath, "utf-8");
        this.data = JSON.parse(content);
      } catch (err) {
        console.error(
          "Failed to read database file, resetting to default:",
          err,
        );
        this.data = defaultData;
        this.save();
      }
    } else {
      this.save();
    }
  }

  private save() {
    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), "utf-8");
    fs.renameSync(tmpPath, this.filePath);
  }

  // Repositories
  getRepositories(): Repository[] {
    return this.data.repositories;
  }

  getRepository(id: string): Repository | undefined {
    return this.data.repositories.find((r) => r.id === id);
  }

  saveRepository(repo: Repository): void {
    const idx = this.data.repositories.findIndex((r) => r.id === repo.id);
    if (idx >= 0) {
      this.data.repositories[idx] = repo;
    } else {
      this.data.repositories.push(repo);
    }
    this.save();
  }

  deleteRepository(id: string): void {
    this.data.repositories = this.data.repositories.filter((r) => r.id !== id);
    this.data.worktrees = this.data.worktrees.filter((w) => w.repoId !== id);
    this.data.sessions = this.data.sessions.filter((s) => s.repoId !== id);
    this.save();
  }

  // Worktrees
  getWorktrees(repoId?: string): Worktree[] {
    if (repoId) {
      return this.data.worktrees.filter((w) => w.repoId === repoId);
    }
    return this.data.worktrees;
  }

  getWorktree(id: string): Worktree | undefined {
    return this.data.worktrees.find((w) => w.id === id);
  }

  saveWorktree(wt: Worktree): void {
    const idx = this.data.worktrees.findIndex((w) => w.id === wt.id);
    if (idx >= 0) {
      this.data.worktrees[idx] = wt;
    } else {
      this.data.worktrees.push(wt);
    }
    this.save();
  }

  deleteWorktree(id: string): void {
    this.data.worktrees = this.data.worktrees.filter((w) => w.id !== id);
    this.data.sessions = this.data.sessions.filter((s) => s.worktreeId !== id);
    this.save();
  }

  // Sessions
  getSessions(worktreeId?: string): AgentSession[] {
    if (worktreeId) {
      return this.data.sessions.filter((s) => s.worktreeId === worktreeId);
    }
    return this.data.sessions;
  }

  getSession(id: string): AgentSession | undefined {
    return this.data.sessions.find((s) => s.id === id);
  }

  saveSession(session: AgentSession): void {
    const idx = this.data.sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      this.data.sessions[idx] = session;
    } else {
      this.data.sessions.push(session);
    }
    this.save();
  }
}

export const store = new Store();
