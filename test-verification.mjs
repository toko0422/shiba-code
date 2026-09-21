import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { simpleGit } from "simple-git";

// Setup a mock local bare repo to clone from
const testDir = path.join(os.tmpdir(), `shiba-test-${Date.now().toString(36)}`);
const originRepoDir = path.join(testDir, "origin-repo");
fs.mkdirSync(originRepoDir, { recursive: true });

console.log(`Setting up test origin repo at: ${originRepoDir}`);
const git = simpleGit(originRepoDir);
await git.init();
await git.addConfig("user.name", "Test User");
await git.addConfig("user.email", "test@example.com");
fs.writeFileSync(
  path.join(originRepoDir, "README.md"),
  "# Test Project\nInitial commit.",
);
await git.add(".");
await git.commit("Initial commit");
await git.branch(["-M", "main"]);

console.log("Origin repo initialized with main branch.");

// Start server in child process or import
process.env.PORT = "3099";
process.env.SHIBA_CODE_DATA_DIR = path.join(testDir, "shiba-data");
process.env.NODE_ENV = "development";

const serverModule = await import("./packages/server/dist/index.js");

// Wait 1s for server to start
await new Promise((r) => setTimeout(r, 1000));

const baseUrl = "http://localhost:3099";

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, headers: res.headers };
}

console.log("\n--- 1. Testing Health API ---");
const health = await request("/api/health");
console.log("Health check:", health.status, health.data);
if (health.status !== 200) throw new Error("Health check failed");

console.log("\n--- 2. Testing Auth / Dev Login ---");
const login = await request("/api/auth/dev-login", { method: "POST" });
console.log("Dev Login status:", login.status, login.data);
const cookie = login.headers.get("set-cookie");
const authHeaders = cookie ? { Cookie: cookie.split(";")[0] } : {};

console.log("\n--- 3. Testing Repo Clone ---");
const clone = await request("/api/repositories/clone", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    url: originRepoDir,
    name: "test-shiba-repo",
  }),
});
console.log("Clone status:", clone.status, clone.data);
if (clone.status !== 200) throw new Error("Clone failed");
const repoId = clone.data.repository.id;

console.log("\n--- 4. Testing Worktree List (Initial) ---");
const wts1 = await request(`/api/repositories/${repoId}/worktrees`, {
  headers: authHeaders,
});
console.log(
  "Initial worktrees:",
  wts1.data.worktrees.map((w) => `${w.branch} (isMain: ${w.isMain})`),
);

console.log("\n--- 5. Testing Create New Worktree ---");
const newWt = await request(`/api/repositories/${repoId}/worktrees`, {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    branch: "feature-parallel-agent",
  }),
});
console.log(
  "Created worktree:",
  newWt.status,
  newWt.data.worktree.branch,
  newWt.data.worktree.path,
);
if (newWt.status !== 200) throw new Error("Create worktree failed");
const wtId = newWt.data.worktree.id;
const wtPath = newWt.data.worktree.path;

console.log("\n--- 6. Testing Git Status in Worktree ---");
// Modify a file in the new worktree
fs.writeFileSync(
  path.join(wtPath, "agent-output.txt"),
  "Hello from Antigravity Agent in parallel worktree!",
);
const status = await request(
  `/api/repositories/${repoId}/worktrees/${wtId}/status`,
  {
    headers: authHeaders,
  },
);
console.log("Git Status in worktree:", status.data.status);
if (status.data.status.files.length === 0)
  throw new Error("File change was not detected in status");

console.log("\n--- 7. Testing Git Diff in Worktree ---");
const diff = await request(
  `/api/repositories/${repoId}/worktrees/${wtId}/diff`,
  {
    headers: authHeaders,
  },
);
console.log("Git Diff summary:\n", diff.data.diff);

console.log("\n--- 8. Testing Commit in Worktree ---");
const commit = await request(
  `/api/repositories/${repoId}/worktrees/${wtId}/commit`,
  {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      message: "feat: add agent-output from parallel worktree",
    }),
  },
);
console.log("Commit status:", commit.status, commit.data);

const statusAfter = await request(
  `/api/repositories/${repoId}/worktrees/${wtId}/status`,
  {
    headers: authHeaders,
  },
);
console.log("Status after commit isClean:", statusAfter.data.status.isClean);
if (!statusAfter.data.status.isClean)
  throw new Error("Worktree should be clean after commit");

console.log("\n--- 9. Testing Remove Worktree ---");
const removeWt = await request(
  `/api/repositories/${repoId}/worktrees/${wtId}`,
  {
    method: "DELETE",
    headers: authHeaders,
  },
);
console.log("Remove worktree status:", removeWt.status, removeWt.data);

const wtsFinal = await request(`/api/repositories/${repoId}/worktrees`, {
  headers: authHeaders,
});
console.log("Final worktrees count:", wtsFinal.data.worktrees.length);

console.log("\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
process.exit(0);
