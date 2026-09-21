import {
  Repository,
  Worktree,
  AgentSession,
  GitStatusSummary,
  AuthUser,
  AgentType,
  GitHubAuthStatus,
  GitHubRepoItem,
} from "@shiba-code/shared";

export const api = {
  // Auth
  async getMe(): Promise<{ user: AuthUser | null }> {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return { user: null };
    return res.json();
  },

  async devLogin(): Promise<{ user: AuthUser }> {
    const res = await fetch("/api/auth/dev-login", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Dev login failed");
    return res.json();
  },

  async logout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  },

  // GitHub Auth
  async getGitHubStatus(): Promise<GitHubAuthStatus> {
    const res = await fetch("/api/auth/github/status", {
      credentials: "include",
    });
    if (!res.ok) return { connected: false, hasOAuthConfig: false };
    return res.json();
  },

  async saveGitHubToken(
    token: string,
  ): Promise<{ ok: boolean; username?: string; avatarUrl?: string }> {
    const res = await fetch("/api/auth/github/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || "Failed to save GitHub token");
    }
    return res.json();
  },

  async disconnectGitHub(): Promise<void> {
    await fetch("/api/auth/github/disconnect", {
      method: "POST",
      credentials: "include",
    });
  },

  async getGitHubRepos(): Promise<GitHubRepoItem[]> {
    const res = await fetch("/api/repositories/github", {
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || "Failed to fetch GitHub repositories");
    }
    const data = await res.json();
    return data.repositories;
  },

  // Repositories
  async getRepositories(): Promise<Repository[]> {
    const res = await fetch("/api/repositories", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch repositories");
    const data = await res.json();
    return data.repositories;
  },

  async cloneRepository(url: string, name?: string): Promise<Repository> {
    const res = await fetch("/api/repositories/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, name }),
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to clone repository");
    }
    const data = await res.json();
    return data.repository;
  },

  async deleteRepository(repoId: string): Promise<void> {
    const res = await fetch(`/api/repositories/${repoId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to delete repository");
  },

  // Worktrees
  async getWorktrees(repoId: string): Promise<Worktree[]> {
    const res = await fetch(`/api/repositories/${repoId}/worktrees`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch worktrees");
    const data = await res.json();
    return data.worktrees;
  },

  async createWorktree(
    repoId: string,
    branch: string,
    baseBranch?: string,
  ): Promise<Worktree> {
    const res = await fetch(`/api/repositories/${repoId}/worktrees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch, baseBranch }),
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create worktree");
    }
    const data = await res.json();
    return data.worktree;
  },

  async removeWorktree(repoId: string, worktreeId: string): Promise<void> {
    const res = await fetch(
      `/api/repositories/${repoId}/worktrees/${worktreeId}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    if (!res.ok) throw new Error("Failed to remove worktree");
  },

  // Git Status & Diff
  async getStatus(
    repoId: string,
    worktreeId: string,
  ): Promise<GitStatusSummary> {
    const res = await fetch(
      `/api/repositories/${repoId}/worktrees/${worktreeId}/status`,
      {
        credentials: "include",
      },
    );
    if (!res.ok) throw new Error("Failed to fetch git status");
    const data = await res.json();
    return data.status;
  },

  async getDiff(
    repoId: string,
    worktreeId: string,
    file?: string,
  ): Promise<string> {
    const q = file ? `?file=${encodeURIComponent(file)}` : "";
    const res = await fetch(
      `/api/repositories/${repoId}/worktrees/${worktreeId}/diff${q}`,
      {
        credentials: "include",
      },
    );
    if (!res.ok) throw new Error("Failed to fetch diff");
    const data = await res.json();
    return data.diff;
  },

  async commit(
    repoId: string,
    worktreeId: string,
    message: string,
  ): Promise<void> {
    const res = await fetch(
      `/api/repositories/${repoId}/worktrees/${worktreeId}/commit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        credentials: "include",
      },
    );
    if (!res.ok) throw new Error("Failed to commit");
  },

  async push(repoId: string, worktreeId: string): Promise<void> {
    const res = await fetch(
      `/api/repositories/${repoId}/worktrees/${worktreeId}/push`,
      {
        method: "POST",
        credentials: "include",
      },
    );
    if (!res.ok) throw new Error("Failed to push");
  },

  // Agent Sessions
  async getOrCreateSession(
    repoId: string,
    worktreeId: string,
    agentType: AgentType = "agy",
  ): Promise<AgentSession> {
    const res = await fetch("/api/agents/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoId, worktreeId, agentType }),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to get/create session");
    const data = await res.json();
    return data.session;
  },

  async startSession(sessionId: string): Promise<AgentSession> {
    const res = await fetch(`/api/agents/sessions/${sessionId}/start`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to start session");
    const data = await res.json();
    return data.session;
  },

  async killSession(sessionId: string): Promise<void> {
    await fetch(`/api/agents/sessions/${sessionId}/kill`, {
      method: "POST",
      credentials: "include",
    });
  },
};
