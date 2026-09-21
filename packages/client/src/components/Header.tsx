import React from "react";
import { GitBranch, FolderGit2, LogOut, Terminal } from "lucide-react";
import { Repository, Worktree, AuthUser } from "@shiba-code/shared";

interface HeaderProps {
  user: AuthUser | null;
  selectedRepo: Repository | null;
  selectedWorktree: Worktree | null;
  onSelectRepoClick: () => void;
  onSelectWorktreeClick: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  selectedRepo,
  selectedWorktree,
  onSelectRepoClick,
  onSelectWorktreeClick,
  onLogout,
}) => {
  return (
    <header className="safe-top bg-slate-900/90 backdrop-blur border-b border-slate-800 text-slate-100 px-3 py-2 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 font-bold text-amber-400 shrink-0">
          <span className="text-xl">🐕</span>
          <span className="text-sm tracking-wide hidden sm:inline">
            ShibaCode
          </span>
        </div>

        {/* Repo badge */}
        <button
          onClick={onSelectRepoClick}
          className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700/80 text-xs px-2.5 py-1 rounded-full border border-slate-700 max-w-[130px] sm:max-w-[180px] truncate"
        >
          <FolderGit2 size={13} className="text-blue-400 shrink-0" />
          <span className="truncate font-medium">
            {selectedRepo ? selectedRepo.name : "Select Repo"}
          </span>
        </button>

        {/* Worktree / Branch badge */}
        {selectedWorktree && (
          <button
            onClick={onSelectWorktreeClick}
            className="flex items-center gap-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full max-w-[120px] sm:max-w-[160px] truncate font-mono"
          >
            <GitBranch size={12} className="shrink-0" />
            <span className="truncate">{selectedWorktree.branch}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {user && (
          <div className="flex items-center gap-1.5">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-6 h-6 rounded-full border border-slate-700"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-[10px] font-bold">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            {user.id.startsWith("gh-") && (
              <span title="GitHub ログイン中" className="text-slate-400">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              </span>
            )}
            <button
              onClick={onLogout}
              title="Logout"
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
