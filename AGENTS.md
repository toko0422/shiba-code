# Repository Guidelines

## Project Structure & Module Organization

This npm-workspaces monorepo contains three packages under `packages/`:

- `shared/` (`@shiba-code/shared`): cross-package types and exports; keep API/event contracts in `src/types.ts`.
- `server/` (`@shiba-code/server`): Express, WebSocket, Git/worktree, authentication, and agent-session code. Organize HTTP handlers in `src/routes/` and domain logic in folders such as `git/`, `auth/`, and `agent/`.
- `client/` (`@shiba-code/client`): React/Vite mobile UI. Place screens in `src/`, reusable UI in `src/components/`, and HTTP calls in `src/api/`.

Compiled output is written to each package's `dist/` directory and is not source code. The root `test-verification.mjs` is the integration test entry point.

## Build, Test, and Development Commands

- `npm install` — install all workspace dependencies.
- `npm run dev` — run the Vite client and server watcher together (ports 3000 and 3001 by default).
- `npm run dev:client` / `npm run dev:server` — run one side only.
- `npm run build` — build every workspace; run this before tests, especially after changing `shared`.
- `npm test` — run the end-to-end verification: local Git setup, API/auth, clone, worktree, diff, and commit flows.

## Coding Style & Naming Conventions

Use TypeScript with 2-space indentation, semicolons, and double-quoted strings, matching existing files. Use PascalCase for React components (`WorktreeList.tsx`), camelCase for functions and values, and descriptive lowercase directory names. Prefer explicit types for public boundaries. Define client/server shared data in `packages/shared/src/types.ts`; use `path.join` or `path.resolve` for filesystem paths so Windows and POSIX both work. Tailwind utilities are the client styling convention; no standalone lint or formatter script is currently configured.

## Testing Guidelines

Treat `npm test` as the required regression check for changes affecting server routes, worktrees, authentication, or shared contracts. It expects built server output, so run `npm run build` first. Add focused checks to `test-verification.mjs` when extending its covered API workflows, and use behavior-oriented test descriptions.

## Commit & Pull Request Guidelines

Follow the history's Conventional Commit pattern: `feat: add worktree action` or `docs: clarify setup`. Keep commits narrowly scoped. Pull requests should explain the user-facing and architectural impact, link relevant issues, list validation commands run, and include mobile screenshots for UI changes. Call out authentication, Git/worktree safety, or configuration changes explicitly.

## Configuration & Safety

Use root or `packages/server/.env` for `PORT`, `HOST`, `ALLOWED_EMAILS`, and Google OAuth credentials; never commit secrets. Preserve uncommitted work during worktree operations and account for small, touch-friendly mobile layouts.
