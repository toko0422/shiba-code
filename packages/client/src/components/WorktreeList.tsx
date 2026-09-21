import React, { useState } from "react";
import { Plus, Trash2, GitFork, Check, ArrowRight, Folder } from "lucide-react";
import { Repository, Worktree } from "@shiba-code/shared";
import { api } from "../api/client.js";

interface WorktreeListProps {
  repo: Repository;
  worktrees: Worktree[];
  selectedWorktree: Worktree | null;
  onSelectWorktree: (wt: Worktree) => void;
  onRefresh: () => void;
}

export const WorktreeList: React.FC<WorktreeListProps> = ({
  repo,
  worktrees,
  selectedWorktree,
  onSelectWorktree,
  onRefresh,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBranch, setNewBranch] = useState("");
  const [baseBranch, setBaseBranch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      const wt = await api.createWorktree(
        repo.id,
        newBranch.trim(),
        baseBranch.trim() || undefined,
      );
      setShowCreateModal(false);
      setNewBranch("");
      setBaseBranch("");
      onRefresh();
      onSelectWorktree(wt);
    } catch (err: any) {
      setError(err.message || "Failed to create worktree");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (wt: Worktree, e: React.MouseEvent) => {
    e.stopPropagation();
    if (wt.isMain) return;
    if (!confirm(`Worktree '${wt.branch}' を削除しますか？`)) return;

    setDeletingId(wt.id);
    try {
      await api.removeWorktree(repo.id, wt.id);
      onRefresh();
    } catch (err: any) {
      alert(`削除に失敗しました: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-3 overflow-y-auto bg-slate-950">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
            <GitFork size={18} className="text-amber-400" />
            Git Worktrees
          </h2>
          <p className="text-xs text-slate-400">
            ブランチごとに独立した作業領域で並列開発を行います
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold shadow"
        >
          <Plus size={15} />
          <span>New Worktree</span>
        </button>
      </div>

      {/* Worktree Cards */}
      <div className="space-y-2.5">
        {worktrees.map((wt) => {
          const isSelected = selectedWorktree?.id === wt.id;
          return (
            <div
              key={wt.id}
              onClick={() => onSelectWorktree(wt)}
              className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                isSelected
                  ? "bg-slate-900/90 border-amber-500/80 shadow-md shadow-amber-500/5"
                  : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-amber-300 truncate">
                      {wt.branch}
                    </span>
                    {wt.isMain && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded font-semibold">
                        MAIN
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                        <Check size={10} /> ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400 font-mono truncate">
                    <Folder size={11} className="shrink-0 text-slate-500" />
                    <span className="truncate">{wt.path}</span>
                  </div>
                </div>

                {!wt.isMain && (
                  <button
                    onClick={(e) => handleDelete(wt, e)}
                    disabled={deletingId === wt.id}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-2 shrink-0"
                    title="Worktreeを削除"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Worktree Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-4 space-y-3">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
              <GitFork size={18} className="text-amber-400" />
              新しい Worktree を作成
            </h3>
            <p className="text-xs text-slate-400">
              指定したブランチ名で独立した作業ディレクトリを生成し、並行してエージェントを実行できるようにします。
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-2.5 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  新しいブランチ名 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="feature/login-ui または fix/issue-12"
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  派生元ブランチ (任意, デフォルト: {repo.defaultBranch})
                </label>
                <input
                  type="text"
                  placeholder={repo.defaultBranch}
                  value={baseBranch}
                  onChange={(e) => setBaseBranch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newBranch.trim()}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs"
                >
                  {isCreating ? "作成中..." : "Worktree を作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
