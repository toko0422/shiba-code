import React, { useState } from "react";
import {
  FolderGit2,
  Plus,
  Trash2,
  Check,
  ExternalLink,
  GitBranch,
} from "lucide-react";
import { Repository } from "@shiba-code/shared";
import { api } from "../api/client.js";

interface RepoManagerProps {
  repositories: Repository[];
  selectedRepo: Repository | null;
  onSelectRepo: (repo: Repository) => void;
  onRefresh: () => void;
}

export const RepoManager: React.FC<RepoManagerProps> = ({
  repositories,
  selectedRepo,
  onSelectRepo,
  onRefresh,
}) => {
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneUrl, setCloneUrl] = useState("");
  const [customName, setCustomName] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneUrl.trim()) return;

    setIsCloning(true);
    setError(null);
    try {
      const repo = await api.cloneRepository(
        cloneUrl.trim(),
        customName.trim() || undefined,
      );
      setShowCloneModal(false);
      setCloneUrl("");
      setCustomName("");
      onRefresh();
      onSelectRepo(repo);
    } catch (err: any) {
      setError(err.message || "Clone failed");
    } finally {
      setIsCloning(false);
    }
  };

  const handleDelete = async (repo: Repository, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`リポジトリ '${repo.name}' を削除しますか？`)) return;

    try {
      await api.deleteRepository(repo.id);
      onRefresh();
    } catch (err: any) {
      alert(`削除に失敗しました: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-3 overflow-y-auto bg-slate-950">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
            <FolderGit2 size={18} className="text-blue-400" />
            Repositories
          </h2>
          <p className="text-xs text-slate-400">
            開発対象の Git リポジトリを管理・クローンします
          </p>
        </div>

        <button
          onClick={() => setShowCloneModal(true)}
          className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold shadow"
        >
          <Plus size={15} />
          <span>Clone Repo</span>
        </button>
      </div>

      {/* Repo Cards */}
      <div className="space-y-2.5">
        {repositories.length === 0 ? (
          <div className="text-center p-8 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
            クローンされたリポジトリがありません。「Clone
            Repo」から追加してください。
          </div>
        ) : (
          repositories.map((repo) => {
            const isSelected = selectedRepo?.id === repo.id;
            return (
              <div
                key={repo.id}
                onClick={() => onSelectRepo(repo)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900/90 border-blue-500/80 shadow-md shadow-blue-500/5"
                    : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100 truncate">
                        {repo.name}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                          <Check size={10} /> SELECTED
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                      {repo.url}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500">
                      <GitBranch size={11} />
                      <span>Default: {repo.defaultBranch}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(repo, e)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg ml-2 shrink-0"
                    title="リポジトリを削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clone Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-4 space-y-3">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
              <FolderGit2 size={18} className="text-amber-400" />
              Git リポジトリをクローン
            </h3>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-2.5 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleClone} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  リポジトリ URL (HTTPS / SSH) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://github.com/username/my-project.git"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  プロジェクト表示名 (任意)
                </label>
                <input
                  type="text"
                  placeholder="my-project"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloneModal(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isCloning || !cloneUrl.trim()}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs"
                >
                  {isCloning ? "クローン中..." : "クローンを実行"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
