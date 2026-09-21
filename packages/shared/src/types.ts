export interface Repository {
  id: string;
  name: string;
  url: string;
  localPath: string;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface Worktree {
  id: string;
  repoId: string;
  branch: string;
  path: string;
  isMain: boolean;
  isLocked?: boolean;
  createdAt: string;
}

export interface GitFileStatus {
  path: string;
  status: "modified" | "added" | "deleted" | "renamed" | "untracked";
  staged: boolean;
}

export interface GitStatusSummary {
  branch: string;
  ahead: number;
  behind: number;
  isClean: boolean;
  files: GitFileStatus[];
}

export interface GitCommitItem {
  hash: string;
  message: string;
  authorName: string;
  authorEmail: string;
  date: string;
}

export type AgentType = "agy" | "codex" | "bash" | "powershell" | "custom";

export interface AgentSession {
  id: string;
  worktreeId: string;
  repoId: string;
  agentType: AgentType;
  command: string;
  args: string[];
  status: "idle" | "running" | "stopped" | "error";
  pid?: number;
  startedAt?: string;
  stoppedAt?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface GitHubAuthStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
  hasOAuthConfig: boolean;
}

export interface GitHubRepoItem {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  cloneUrl: string;
  defaultBranch: string;
  description?: string;
  updatedAt: string;
}

// WebSocket message payloads
export type WSClientMessage =
  | { type: "terminal:input"; sessionId: string; data: string }
  | { type: "terminal:resize"; sessionId: string; cols: number; rows: number }
  | { type: "terminal:start"; sessionId: string }
  | { type: "terminal:kill"; sessionId: string }
  | { type: "session:subscribe"; sessionId: string };

export type WSServerMessage =
  | { type: "terminal:output"; sessionId: string; data: string }
  | { type: "terminal:exit"; sessionId: string; exitCode: number }
  | { type: "session:status"; session: AgentSession }
  | { type: "error"; message: string };
