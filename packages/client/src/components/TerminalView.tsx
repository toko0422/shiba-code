import React, { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import {
  Play,
  Square,
  RotateCw,
  Send,
  CornerDownLeft,
  Sparkles,
  Command,
} from "lucide-react";
import {
  Worktree,
  AgentSession,
  AgentType,
  WSClientMessage,
  WSServerMessage,
} from "@shiba-code/shared";
import { api } from "../api/client.js";

interface TerminalViewProps {
  worktree: Worktree;
  agentType: AgentType;
  onChangeAgentType: (type: AgentType) => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  worktree,
  agentType,
  onChangeAgentType,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<Terminal | null>(null);
  const fitAddonInstance = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [session, setSession] = useState<AgentSession | null>(null);
  const [promptInput, setPromptInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Initialize or fetch session
  const loadSession = useCallback(async () => {
    try {
      const sess = await api.getOrCreateSession(
        worktree.repoId,
        worktree.id,
        agentType,
      );
      setSession(sess);
      return sess;
    } catch (err) {
      console.error("Failed to load session:", err);
      return null;
    }
  }, [worktree.id, worktree.repoId, agentType]);

  // Connect WebSocket
  useEffect(() => {
    let unmounted = false;

    loadSession().then((sess) => {
      if (!sess || unmounted) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Subscribe to session
        const subMsg: WSClientMessage = {
          type: "session:subscribe",
          sessionId: sess.id,
        };
        ws.send(JSON.stringify(subMsg));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSServerMessage;
          if (msg.type === "terminal:output") {
            xtermInstance.current?.write(msg.data);
          } else if (msg.type === "session:status") {
            setSession(msg.session);
          } else if (msg.type === "terminal:exit") {
            setSession((prev) =>
              prev ? { ...prev, status: "stopped" } : null,
            );
          }
        } catch (err) {
          console.error("WS parse error:", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
      };
    });

    return () => {
      unmounted = true;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [worktree.id, agentType, loadSession]);

  // Initialize xterm
  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#090d16",
        foreground: "#e2e8f0",
        cursor: "#f59e0b",
        black: "#1e293b",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#f59e0b",
        blue: "#3b82f6",
        magenta: "#d946ef",
        cyan: "#06b6d4",
        white: "#f8fafc",
      },
      convertEol: true,
      disableStdin: false,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstance.current = term;
    fitAddonInstance.current = fitAddon;

    term.onData((data) => {
      if (session && wsRef.current?.readyState === WebSocket.OPEN) {
        const msg: WSClientMessage = {
          type: "terminal:input",
          sessionId: session.id,
          data,
        };
        wsRef.current.send(JSON.stringify(msg));
      }
    });

    const handleResize = () => {
      try {
        fitAddon.fit();
        if (session && wsRef.current?.readyState === WebSocket.OPEN) {
          const msg: WSClientMessage = {
            type: "terminal:resize",
            sessionId: session.id,
            cols: term.cols,
            rows: term.rows,
          };
          wsRef.current.send(JSON.stringify(msg));
        }
      } catch {}
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
    };
  }, [session?.id]);

  const sendKey = (data: string) => {
    if (session && wsRef.current?.readyState === WebSocket.OPEN) {
      const msg: WSClientMessage = {
        type: "terminal:input",
        sessionId: session.id,
        data,
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const handleStartSession = async () => {
    if (!session) return;
    setIsStarting(true);
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "terminal:start",
            sessionId: session.id,
          } as WSClientMessage),
        );
      } else {
        await api.startSession(session.id);
      }
      setSession((prev) => (prev ? { ...prev, status: "running" } : null));
    } catch (err) {
      console.error("Failed to start session:", err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleKillSession = async () => {
    if (!session) return;
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "terminal:kill",
            sessionId: session.id,
          } as WSClientMessage),
        );
      } else {
        await api.killSession(session.id);
      }
      setSession((prev) => (prev ? { ...prev, status: "stopped" } : null));
    } catch (err) {
      console.error("Failed to kill session:", err);
    }
  };

  const handleSendPrompt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim()) return;

    sendKey(`${promptInput}\r\n`);
    setPromptInput("");
  };

  const quickPrompts = [
    "テストを実行して結果を確認して",
    "変更差分をレビューしてコミットを作成して",
    "現在のエラーを修正して",
    "コードの進捗状況を教えて",
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs shrink-0">
        <div className="flex items-center gap-2">
          {/* Agent Type Selector */}
          <select
            value={agentType}
            onChange={(e) => onChangeAgentType(e.target.value as AgentType)}
            className="bg-slate-800 border border-slate-700 text-amber-300 font-semibold rounded px-2 py-1 text-xs outline-none"
          >
            <option value="agy">Antigravity (agy)</option>
            <option value="codex">Codex CLI</option>
            <option value="powershell">PowerShell</option>
            <option value="bash">Bash</option>
          </select>

          {/* Status badge */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                session?.status === "running"
                  ? "bg-emerald-400 animate-pulse"
                  : session?.status === "idle"
                    ? "bg-amber-400"
                    : "bg-slate-500"
              }`}
            />
            <span className="text-[11px] font-mono text-slate-400">
              {session?.status || "idle"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {session?.status === "running" ? (
            <button
              onClick={handleKillSession}
              className="flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 px-2 py-1 rounded text-xs"
            >
              <Square size={12} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={handleStartSession}
              disabled={isStarting}
              className="flex items-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded text-xs font-semibold"
            >
              <Play size={12} />
              <span>{isStarting ? "Starting..." : "Start"}</span>
            </button>
          )}

          <button
            onClick={() => xtermInstance.current?.clear()}
            title="Clear terminal"
            className="p-1 text-slate-400 hover:text-slate-200"
          >
            <RotateCw size={13} />
          </button>
        </div>
      </div>

      {/* Terminal Display Container */}
      <div className="flex-1 relative overflow-hidden bg-[#090d16] p-1">
        <div ref={terminalRef} className="h-full w-full" />
      </div>

      {/* Mobile Special Keys Bar */}
      <div className="bg-slate-900 border-t border-slate-800 px-2 py-1 flex items-center gap-1.5 overflow-x-auto shrink-0 select-none">
        <button
          onClick={() => sendKey("\x03")} // Ctrl+C
          className="bg-red-950/70 border border-red-700/60 text-red-300 font-mono text-xs px-2.5 py-1 rounded active:bg-red-900 shrink-0 font-bold"
        >
          ^C
        </button>
        <button
          onClick={() => sendKey("\t")} // Tab
          className="bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs px-2.5 py-1 rounded active:bg-slate-700 shrink-0"
        >
          Tab
        </button>
        <button
          onClick={() => sendKey("\x1b[A")} // Up arrow
          className="bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs px-2 py-1 rounded active:bg-slate-700 shrink-0"
        >
          ↑
        </button>
        <button
          onClick={() => sendKey("\x1b[B")} // Down arrow
          className="bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs px-2 py-1 rounded active:bg-slate-700 shrink-0"
        >
          ↓
        </button>
        <button
          onClick={() => sendKey("y\r\n")}
          className="bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 font-mono text-xs px-2.5 py-1 rounded active:bg-emerald-900 shrink-0 font-bold"
        >
          y
        </button>
        <button
          onClick={() => sendKey("n\r\n")}
          className="bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs px-2.5 py-1 rounded active:bg-slate-700 shrink-0 font-bold"
        >
          n
        </button>
        <button
          onClick={() => sendKey("\r\n")}
          className="bg-slate-800 border border-slate-700 text-amber-300 font-mono text-xs px-2.5 py-1 rounded active:bg-slate-700 shrink-0"
        >
          Enter
        </button>
      </div>

      {/* Quick Prompts Carousel */}
      <div className="bg-slate-900/80 px-2 py-1 flex items-center gap-1.5 overflow-x-auto border-t border-slate-800/60 shrink-0">
        <span className="text-amber-400 text-[10px] font-bold flex items-center gap-0.5 shrink-0">
          <Sparkles size={11} />
          Quick:
        </span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => setPromptInput(p)}
            className="text-[11px] bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Prompt Input Form */}
      <form
        onSubmit={handleSendPrompt}
        className="p-2 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 shrink-0"
      >
        <input
          type="text"
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          placeholder="エージェントへプロンプトやコマンドを入力..."
          className="flex-1 bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none"
        />
        <button
          type="submit"
          disabled={!promptInput.trim()}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold p-2.5 rounded-lg shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
