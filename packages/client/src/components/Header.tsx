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
