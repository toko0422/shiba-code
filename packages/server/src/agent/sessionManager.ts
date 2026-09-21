import { spawn, ChildProcess } from "node:child_process";
import os from "node:os";
import { EventEmitter } from "node:events";
import { AgentSession, AgentType } from "@shiba-code/shared";
import { store } from "../store.js";

interface TerminalProcess {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
  pid?: number;
}

export class SessionInstance extends EventEmitter {
  public session: AgentSession;
  private ptyProcess: TerminalProcess | null = null;
  private logBuffer: string[] = [];
  private maxBufferLines = 2000;

  constructor(session: AgentSession) {
    super();
    this.session = session;
  }

  async start(cwd: string) {
    if (this.session.status === "running") {
      return;
    }

    const isWindows = os.platform() === "win32";
    const env = {
      ...process.env,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
    };

    let command = this.session.command;
    let args = this.session.args;

    // Default commands if not specified
    if (!command) {
      if (this.session.agentType === "agy") {
        command = isWindows ? "agy.cmd" : "agy";
      } else if (this.session.agentType === "codex") {
        command = isWindows ? "codex.cmd" : "codex";
      } else if (this.session.agentType === "powershell") {
        command = "powershell.exe";
      } else {
        command = isWindows ? "powershell.exe" : "/bin/bash";
      }
    }

    let nodePty: any = null;
    try {
      // Dynamically import node-pty if available on host
      const moduleName = "node-pty";
      nodePty = await (Function(
        "m",
        "return import(m)",
      )(moduleName) as Promise<any>);
    } catch {
      // Fallback to child_process
    }

    if (nodePty && typeof nodePty.spawn === "function") {
      try {
        const pty = nodePty.spawn(command, args, {
          name: "xterm-color",
          cols: 80,
          rows: 24,
          cwd,
          env,
        });

        this.ptyProcess = {
          write: (data: string) => pty.write(data),
          resize: (cols: number, rows: number) => {
            try {
              pty.resize(cols, rows);
            } catch (err) {
              // ignore resize errors
            }
          },
          kill: () => pty.kill(),
          pid: pty.pid,
        };

        pty.onData((data: string) => {
          this.appendLog(data);
          this.emit("data", data);
        });

        pty.onExit(({ exitCode }: { exitCode: number }) => {
          this.onExit(exitCode);
        });

        this.session.pid = pty.pid;
        this.session.status = "running";
        this.session.startedAt = new Date().toISOString();
        store.saveSession(this.session);
        return;
      } catch (err) {
        console.warn(
          "node-pty failed to spawn, falling back to child_process:",
          err,
        );
      }
    }

    // Fallback: child_process.spawn with shell
    const shellCmd = isWindows ? "powershell.exe" : "/bin/bash";
    const shellArgs = isWindows
      ? ["-NoLogo", "-NoExit", "-Command", `${command} ${args.join(" ")}`]
      : ["-c", `${command} ${args.join(" ")}`];

    const cp: ChildProcess = spawn(shellCmd, shellArgs, {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.ptyProcess = {
      write: (data: string) => {
        if (cp.stdin && !cp.stdin.destroyed) {
          cp.stdin.write(data);
        }
      },
      resize: () => {},
      kill: () => {
        cp.kill();
      },
      pid: cp.pid,
    };

    cp.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf-8");
      this.appendLog(text);
      this.emit("data", text);
    });

    cp.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf-8");
      this.appendLog(text);
      this.emit("data", text);
    });

    cp.on("close", (code: number | null) => {
      this.onExit(code ?? 0);
    });

    this.session.pid = cp.pid;
    this.session.status = "running";
    this.session.startedAt = new Date().toISOString();
    store.saveSession(this.session);
  }

  private appendLog(data: string) {
    this.logBuffer.push(data);
    if (this.logBuffer.length > this.maxBufferLines) {
      this.logBuffer.splice(0, this.logBuffer.length - this.maxBufferLines);
    }
  }

  private onExit(exitCode: number) {
    this.session.status = "stopped";
    this.session.stoppedAt = new Date().toISOString();
    store.saveSession(this.session);
    this.emit("exit", exitCode);
  }

  write(data: string) {
    this.ptyProcess?.write(data);
  }

  resize(cols: number, rows: number) {
    this.ptyProcess?.resize(cols, rows);
  }

  kill() {
    this.ptyProcess?.kill();
    this.session.status = "stopped";
    this.session.stoppedAt = new Date().toISOString();
    store.saveSession(this.session);
  }

  getBuffer(): string {
    return this.logBuffer.join("");
  }
}

export class SessionManager {
  private instances = new Map<string, SessionInstance>();

  getOrCreateSession(
    worktreeId: string,
    repoId: string,
    agentType: AgentType = "agy",
    command: string = "",
    args: string[] = [],
  ): SessionInstance {
    // Find existing session for this worktree
    const existing = store
      .getSessions(worktreeId)
      .find((s) => s.agentType === agentType);
    if (existing && this.instances.has(existing.id)) {
      return this.instances.get(existing.id)!;
    }

    const sessionId =
      existing?.id ||
      `sess-${worktreeId}-${agentType}-${Date.now().toString(36)}`;
    const session: AgentSession = existing || {
      id: sessionId,
      worktreeId,
      repoId,
      agentType,
      command,
      args,
      status: "idle",
    };

    store.saveSession(session);

    const instance = new SessionInstance(session);
    this.instances.set(sessionId, instance);
    return instance;
  }

  getInstance(sessionId: string): SessionInstance | undefined {
    return this.instances.get(sessionId);
  }

  killSession(sessionId: string) {
    const instance = this.instances.get(sessionId);
    if (instance) {
      instance.kill();
    }
  }
}

export const sessionManager = new SessionManager();
