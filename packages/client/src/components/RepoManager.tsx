import React, { useState, useEffect, useCallback } from "react";
import {
  FolderGit2,
  Plus,
  Trash2,
  Check,
  GitBranch,
  Search,
  Lock,
  Globe,
  RefreshCw,
  Key,
  X,
  ExternalLink,
} from "lucide-react";
import { Repository, GitHubAuthStatus, GitHubRepoItem } from "@shiba-code/shared";
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

  // GitHub state
  const [gitHubStatus, setGitHubStatus] = useState<GitHubAuthStatus | null>(
    null,
  );
  const [gitHubRepos, setGitHubRepos] = useState<GitHubRepoItem[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [cloneTab, setCloneTab] = useState<"github" | "url">("github");

  // PAT Modal state
  const [showPatModal, setShowPatModal] = useState(false);
  const [patInput, setPatInput] = useState("");
  const [patSaving, setPatSaving] = useState(false);
  const [patError, setPatError] = useState<string | null>(null);

  const fetchGitHubStatus = useCallback(async () => {
    try {
      const status = await api.getGitHubStatus();
      setGitHubStatus(status);
      if (!status.connected) {
        setCloneTab("url");
      }
    } catch {
      setGitHubStatus(null);
    }
  }, []);

  const fetchGitHubRepos = useCallback(async () => {
    setIsLoadingRepos(true);
    setError(null);
    try {
      const repos = await api.getGitHubRepos();
      setGitHubRepos(repos);
    } catch (err: any) {
      console.error("Failed to fetch GitHub repos:", err);
      setError(err.message || "GitHub リポジトリの取得に失敗しました");
    } finally {
      setIsLoadingRepos(false);
    }
  }, []);

  useEffect(() => {
    fetchGitHubStatus();
  }, [fetchGitHubStatus]);

  useEffect(() => {
    if (showCloneModal && gitHubStatus?.connected && gitHubRepos.length === 0) {
      fetchGitHubRepos();
    }
  }, [showCloneModal, gitHubStatus, gitHubRepos.length, fetchGitHubRepos]);

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

  const handleCloneGitHubRepo = async (ghRepo: GitHubRepoItem) => {
    setIsCloning(true);
    setError(null);
    try {
      const repo = await api.cloneRepository(ghRepo.cloneUrl, ghRepo.name);
      setShowCloneModal(false);
      onRefresh();
      onSelectRepo(repo);
    } catch (err: any) {
      setError(err.message || "Clone failed");
    } finally {
      setIsCloning(false);
    }
  };

  const handleSavePat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patInput.trim()) return;

    setPatSaving(true);
    setPatError(null);
    try {
      await api.saveGitHubToken(patInput.trim());
      setShowPatModal(false);
      setPatInput("");
      await fetchGitHubStatus();
      setCloneTab("github");
      fetchGitHubRepos();
    } catch (err: any) {
      setPatError(err.message || "PAT の保存・検証に失敗しました");
    } finally {
      setPatSaving(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!confirm("GitHub アカウントの連携を解除しますか？")) return;
    try {
      await api.disconnectGitHub();
      await fetchGitHubStatus();
      setGitHubRepos([]);
      setCloneTab("url");
    } catch (err: any) {
      alert(`連携解除に失敗しました: ${err.message}`);
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

  const filteredRepos = gitHubRepos.filter(
    (r) =>
      r.fullName.toLowerCase().includes(repoSearch.toLowerCase()) ||
      (r.description &&
        r.description.toLowerCase().includes(repoSearch.toLowerCase())),
  );

  return (
    <div className="flex-1 flex flex-col p-3 overflow-y-auto bg-slate-950">
      <div className="flex items-center justify-between mb-2">
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
          onClick={() => {
            setShowCloneModal(true);
            if (gitHubStatus?.connected && gitHubRepos.length === 0) {
              fetchGitHubRepos();
            }
          }}
          className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold shadow transition-transform active:scale-95"
        >
          <Plus size={15} />
          <span>Clone Repo</span>
        </button>
      </div>

      {/* GitHub Integration Status Bar */}
      <div className="mb-3 bg-slate-900/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
        {gitHubStatus?.connected ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 min-w-0">
              {gitHubStatus.avatarUrl ? (
                <img
                  src={gitHubStatus.avatarUrl}
                  alt={gitHubStatus.username || "GitHub"}
                  className="w-5 h-5 rounded-full border border-slate-700 shrink-0"
                />
              ) : (
                <svg
                  className="w-4 h-4 fill-slate-300 shrink-0"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              )}
              <span className="text-slate-300 font-medium truncate">
                GitHub: <strong className="text-slate-100">@{gitHubStatus.username || "連携中"}</strong>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={fetchGitHubRepos}
                disabled={isLoadingRepos}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                title="リポジトリ再読込"
              >
                <RefreshCw
                  size={13}
                  className={isLoadingRepos ? "animate-spin" : ""}
                />
              </button>
              <button
                onClick={handleDisconnectGitHub}
                className="text-[11px] text-slate-400 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-red-500/10 transition-colors"
              >
                連携解除
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-1.5 text-slate-400 truncate">
              <Lock size={13} className="text-amber-400 shrink-0" />
              <span className="truncate">GitHub未連携 (プライベートRepo対応)</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href="/api/auth/github"
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <span>OAuth 連携</span>
              </a>
              <button
                onClick={() => setShowPatModal(true)}
                className="bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80 px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
              >
                <Key size={11} />
                <span>PAT</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Repo Cards */}
      <div className="space-y-2.5">
        {repositories.length === 0 ? (
          <div className="text-center p-8 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
            クローンされたリポジトリがありません。「Clone Repo」から追加してください。
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <FolderGit2 size={18} className="text-amber-400" />
                Git リポジトリをクローン
              </h3>
              <button
                onClick={() => setShowCloneModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Segmented Control Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setCloneTab("github");
                  if (gitHubStatus?.connected && gitHubRepos.length === 0) {
                    fetchGitHubRepos();
                  }
                }}
                className={`py-1.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  cloneTab === "github"
                    ? "bg-slate-800 text-slate-100 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Lock size={12} className="text-amber-400" />
                <span>GitHub から選択</span>
              </button>
              <button
                type="button"
                onClick={() => setCloneTab("url")}
                className={`py-1.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  cloneTab === "url"
                    ? "bg-slate-800 text-slate-100 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Globe size={12} className="text-blue-400" />
                <span>URL を直接入力</span>
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-2.5 rounded-lg">
                {error}
              </div>
            )}

            {/* Tab 1: GitHub Repositories Picker */}
            {cloneTab === "github" && (
              <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
                {!gitHubStatus?.connected ? (
                  <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-xl text-center space-y-3 my-2">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                      <Lock size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        GitHub アカウントが未連携です
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                        連携するとプライベートリポジトリも一覧からワンタップでクローンできます。
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <a
                        href="/api/auth/github"
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        GitHub OAuth 連携
                      </a>
                      <button
                        onClick={() => setShowPatModal(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      >
                        PAT を入力
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Search bar */}
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="リポジトリを検索 (例: my-repo)..."
                        value={repoSearch}
                        onChange={(e) => setRepoSearch(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-500"
                      />
                    </div>

                    {/* Repos list */}
                    <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[300px] pr-1">
                      {isLoadingRepos ? (
                        <div className="text-center py-8 text-slate-500 text-xs flex items-center justify-center gap-2">
                          <RefreshCw size={14} className="animate-spin" />
                          <span>リポジトリ一覧を取得中...</span>
                        </div>
                      ) : filteredRepos.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs">
                          {gitHubRepos.length === 0
                            ? "リポジトリが見つかりませんでした"
                            : "検索条件に一致するリポジトリがありません"}
                        </div>
                      ) : (
                        filteredRepos.map((ghRepo) => (
                          <div
                            key={ghRepo.id}
                            className="bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {ghRepo.private ? (
                                  <span title="Private repository">
                                    <Lock
                                      size={12}
                                      className="text-amber-400 shrink-0"
                                    />
                                  </span>
                                ) : (
                                  <span title="Public repository">
                                    <Globe
                                      size={12}
                                      className="text-slate-400 shrink-0"
                                    />
                                  </span>
                                )}
                                <span className="font-semibold text-xs text-slate-200 truncate">
                                  {ghRepo.fullName}
                                </span>
                              </div>
                              {ghRepo.description && (
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {ghRepo.description}
                                </p>
                              )}
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                更新: {new Date(ghRepo.updatedAt).toLocaleDateString()}
                              </div>
                            </div>

                            <button
                              onClick={() => handleCloneGitHubRepo(ghRepo)}
                              disabled={isCloning}
                              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs shrink-0 transition-transform active:scale-95"
                            >
                              {isCloning ? "クローン中..." : "クローン"}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab 2: Manual URL Form */}
            {cloneTab === "url" && (
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
                    className="w-full bg-slate-950/70 border border-slate-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    ※ GitHub 連携済みの場合、プライベートリポジトリ URL も自動認証されます
                  </p>
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
                    className="w-full bg-slate-950/70 border border-slate-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
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
            )}
          </div>
        </div>
      )}

      {/* Personal Access Token (PAT) Modal */}
      {showPatModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <Key size={16} className="text-amber-400" />
                GitHub Personal Access Token (PAT)
              </h3>
              <button
                onClick={() => setShowPatModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              OAuth App を設定せずに利用する場合や、独自の Token を使用したい場合に Personal Access Token（classic または fine-grained）を保存できます。
            </p>

            {patError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-2.5 rounded-lg">
                {patError}
              </div>
            )}

            <form onSubmit={handleSavePat} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Access Token (ghp_... / github_pat_...) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={patInput}
                  onChange={(e) => setPatInput(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none font-mono"
                />
                <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500">
                  <span>必要スコープ: <code>repo</code></span>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email&description=ShibaCode"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>トークン発行ページ</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPatModal(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={patSaving || !patInput.trim()}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs"
                >
                  {patSaving ? "検証・保存中..." : "保存して連携"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
