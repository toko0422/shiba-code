import React, { useEffect, useState, useCallback } from "react";
import { Repository, Worktree, AuthUser, AgentType } from "@shiba-code/shared";
import { api } from "./api/client.js";
import { Header } from "./components/Header.js";
import { BottomNav, ActiveTab } from "./components/BottomNav.js";
import { TerminalView } from "./components/TerminalView.js";
import { WorktreeList } from "./components/WorktreeList.js";
import { DiffView } from "./components/DiffView.js";
import { RepoManager } from "./components/RepoManager.js";
import { LoginModal } from "./components/LoginModal.js";

export const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [selectedWorktree, setSelectedWorktree] = useState<Worktree | null>(
    null,
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>("terminal");
  const [agentType, setAgentType] = useState<AgentType>("agy");
  const [uncommittedCount, setUncommittedCount] = useState<number>(0);

  // Check auth on load
  const checkAuth = useCallback(async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  // Fetch repositories
  const fetchRepositories = useCallback(async () => {
    try {
      const repos = await api.getRepositories();
      setRepositories(repos);
      if (repos.length > 0 && !selectedRepo) {
        setSelectedRepo(repos[0]);
      }
    } catch (err) {
      console.error("Failed to fetch repositories:", err);
    }
  }, [selectedRepo]);

  // Fetch worktrees when repo changes
  const fetchWorktrees = useCallback(async (repoId: string) => {
    try {
      const wts = await api.getWorktrees(repoId);
      setWorktrees(wts);
      if (wts.length > 0) {
        setSelectedWorktree((prev) => {
          if (prev && wts.some((w) => w.id === prev.id)) {
            return prev;
          }
          return wts[0];
        });
      } else {
        setSelectedWorktree(null);
      }
    } catch (err) {
      console.error("Failed to fetch worktrees:", err);
    }
  }, []);

  // Fetch git status count
  const checkGitStatus = useCallback(async () => {
    if (!selectedRepo || !selectedWorktree) return;
    try {
      const status = await api.getStatus(selectedRepo.id, selectedWorktree.id);
      setUncommittedCount(status.files.length);
    } catch {
      setUncommittedCount(0);
    }
  }, [selectedRepo, selectedWorktree]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      fetchRepositories();
    }
  }, [user, fetchRepositories]);

  useEffect(() => {
    if (selectedRepo) {
      fetchWorktrees(selectedRepo.id);
    }
  }, [selectedRepo, fetchWorktrees]);

  useEffect(() => {
    checkGitStatus();
  }, [checkGitStatus]);

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  if (!authChecked) {
    return (
      <div className="h-full bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl animate-bounce">🐕</span>
          <span className="text-xs">Loading Shiba Code...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginModal onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <Header
        user={user}
        selectedRepo={selectedRepo}
        selectedWorktree={selectedWorktree}
        onSelectRepoClick={() => setActiveTab("repos")}
        onSelectWorktreeClick={() => setActiveTab("worktrees")}
        onLogout={handleLogout}
      />

      {/* Main Content Pane */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === "terminal" &&
          (selectedWorktree ? (
            <TerminalView
              key={`${selectedWorktree.id}-${agentType}`}
              worktree={selectedWorktree}
              agentType={agentType}
              onChangeAgentType={setAgentType}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center text-slate-400">
              <span className="text-4xl mb-2">📁</span>
              <p className="text-sm font-semibold">
                Worktree が選択されていません
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                まずは「Repos」または「Worktrees」からリポジトリと作業ブランチを選択してください。
              </p>
              <button
                onClick={() => setActiveTab("worktrees")}
                className="mt-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs"
              >
                Worktree を開く
              </button>
            </div>
          ))}

        {activeTab === "worktrees" &&
          (selectedRepo ? (
            <WorktreeList
              repo={selectedRepo}
              worktrees={worktrees}
              selectedWorktree={selectedWorktree}
              onSelectWorktree={(wt) => {
                setSelectedWorktree(wt);
                setActiveTab("terminal");
              }}
              onRefresh={() => selectedRepo && fetchWorktrees(selectedRepo.id)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center text-slate-400">
              <p className="text-sm">リポジトリが選択されていません</p>
              <button
                onClick={() => setActiveTab("repos")}
                className="mt-2 bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
              >
                リポジトリを選択
              </button>
            </div>
          ))}

        {activeTab === "diff" &&
          (selectedWorktree ? (
            <DiffView worktree={selectedWorktree} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Worktree を選択してください
            </div>
          ))}

        {activeTab === "repos" && (
          <RepoManager
            repositories={repositories}
            selectedRepo={selectedRepo}
            onSelectRepo={(repo) => {
              setSelectedRepo(repo);
              setActiveTab("worktrees");
            }}
            onRefresh={fetchRepositories}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        uncommittedCount={uncommittedCount}
      />
    </div>
  );
};
