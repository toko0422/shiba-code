import React, { useEffect, useState, useCallback } from "react";
import {
  GitCompare,
  CheckCircle2,
  FileCode,
  Upload,
  RefreshCw,
  GitCommit,
} from "lucide-react";
import { Worktree, GitStatusSummary } from "@shiba-code/shared";
import { api } from "../api/client.js";

interface DiffViewProps {
  worktree: Worktree;
}

export const DiffView: React.FC<DiffViewProps> = ({ worktree }) => {
  const [status, setStatus] = useState<GitStatusSummary | null>(null);
  const [diffText, setDiffText] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [pushing, setPushing] = useState(false);

  const fetchStatusAndDiff = useCallback(async () => {
    setLoading(true);
    try {
      const [st, df] = await Promise.all([
        api.getStatus(worktree.repoId, worktree.id),
        api.getDiff(worktree.repoId, worktree.id, selectedFile || undefined),
      ]);
      setStatus(st);
      setDiffText(df);
    } catch (err) {
      console.error("Failed to fetch diff/status:", err);
    } finally {
      setLoading(false);
    }
  }, [worktree.id, worktree.repoId, selectedFile]);

  useEffect(() => {
    fetchStatusAndDiff();
  }, [fetchStatusAndDiff]);

  const handleCommit = async (andPush: boolean) => {
    if (!commitMessage.trim()) return;
    setCommitting(true);
    try {
      await api.commit(worktree.repoId, worktree.id, commitMessage.trim());
      setCommitMessage("");
      if (andPush) {
        setPushing(true);
        await api.push(worktree.repoId, worktree.id);
      }
      await fetchStatusAndDiff();
    } catch (err: any) {
      alert(`操作に失敗しました: ${err.message}`);
    } finally {
      setCommitting(false);
      setPushing(false);
    }
  };

  const handlePushOnly = async () => {
    setPushing(true);
    try {
      await api.push(worktree.repoId, worktree.id);
      await fetchStatusAndDiff();
    } catch (err: any) {
      alert(`プッシュに失敗しました: ${err.message}`);
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <GitCompare size={18} className="text-amber-400" />
          <h2 className="text-sm font-bold text-slate-100">Changes & Diff</h2>
          {status && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                status.isClean
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}
            >
              {status.isClean ? "Clean" : `${status.files.length} changed`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {status && status.ahead > 0 && (
            <button
              onClick={handlePushOnly}
              disabled={pushing}
              className="flex items-center gap-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs px-2 py-1 rounded"
            >
              <Upload size={12} />
              <span>Push ({status.ahead})</span>
            </button>
          )}

          <button
            onClick={fetchStatusAndDiff}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-200"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Changed Files Horizontal Scroll List */}
      {status && status.files.length > 0 && (
        <div className="p-2 bg-slate-900/50 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <button
            onClick={() => setSelectedFile(null)}
            className={`text-xs px-2.5 py-1 rounded-lg shrink-0 font-mono transition-colors ${
              selectedFile === null
                ? "bg-amber-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            All Files ({status.files.length})
          </button>
          {status.files.map((f) => (
            <button
              key={f.path}
              onClick={() => setSelectedFile(f.path)}
              className={`text-xs px-2 py-1 rounded-lg shrink-0 font-mono flex items-center gap-1.5 transition-colors ${
                selectedFile === f.path
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              <span
                className={`text-[10px] font-bold ${
                  f.status === "modified"
                    ? "text-amber-400"
                    : f.status === "added" || f.status === "untracked"
                      ? "text-emerald-400"
                      : "text-red-400"
                }`}
              >
                {f.status === "modified"
                  ? "M"
                  : f.status === "deleted"
                    ? "D"
                    : "+"}
              </span>
              <span className="truncate max-w-[120px]">
                {f.path.split("/").pop()}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Diff Content View */}
      <div className="flex-1 overflow-auto p-2 bg-[#090d16] font-mono text-xs select-text">
        {status?.isClean ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <CheckCircle2 size={32} className="text-emerald-500" />
            <p>Working tree is clean. 差分はありません。</p>
          </div>
        ) : diffText ? (
          <pre className="whitespace-pre font-mono leading-relaxed">
            {diffText.split("\n").map((line, idx) => {
              let colorClass = "text-slate-300";
              if (line.startsWith("+") && !line.startsWith("+++")) {
                colorClass = "text-emerald-400 bg-emerald-950/30";
              } else if (line.startsWith("-") && !line.startsWith("---")) {
                colorClass = "text-red-400 bg-red-950/30";
              } else if (line.startsWith("@@")) {
                colorClass = "text-cyan-400 bg-cyan-950/20";
              } else if (line.startsWith("diff --git")) {
                colorClass = "text-amber-300 font-bold mt-2 block";
              }
              return (
                <div key={idx} className={`${colorClass} px-1 rounded`}>
                  {line}
                </div>
              );
            })}
          </pre>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            差分データを読み込み中...
          </div>
        )}
      </div>

      {/* Bottom Commit Form */}
      {status && !status.isClean && (
        <div className="p-2.5 bg-slate-900 border-t border-slate-800 space-y-2 shrink-0">
          <input
            type="text"
            placeholder="コミットメッセージを入力..."
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCommit(false)}
              disabled={committing || !commitMessage.trim()}
              className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold py-1.5 rounded-lg"
            >
              <GitCommit size={14} />
              <span>{committing ? "Commit..." : "Commit Only"}</span>
            </button>
            <button
              onClick={() => handleCommit(true)}
              disabled={committing || pushing || !commitMessage.trim()}
              className="flex-1 flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold py-1.5 rounded-lg"
            >
              <Upload size={14} />
              <span>{pushing ? "Pushing..." : "Commit & Push"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
