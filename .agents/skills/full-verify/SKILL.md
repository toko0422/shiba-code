---
name: full-verify
description: >-
  Builds all packages (shared, server, client) and runs the end-to-end verification
  test suite for Shiba Code. Use this skill when verifying code changes, checking for
  type errors, or before committing code to ensure the entire workspace is healthy.
---

# Shiba Code Full Verification Procedure

Follow these steps to ensure that all packages build correctly and integration tests pass.

## 1. Build All Packages

Run the workspace build to generate TypeScript outputs and frontend assets:

```bash
npm run build
```

- If `packages/shared` fails, fix type errors in `packages/shared/src/types.ts` first, as other packages depend on it.
- If `packages/server` fails, check TypeScript compilation issues in `packages/server/src/`.
- If `packages/client` fails, check Vite/TypeScript build issues in `packages/client/src/`.

## 2. Run Verification Tests

Run the E2E integration test suite:

```bash
npm test
```

This executes `node test-verification.mjs`, which tests:

1. Health check API (`/api/health`)
2. Dev login authentication (`/api/auth/dev-login`)
3. Repository cloning (`/api/repositories/clone`)
4. Initial worktree listing (`/api/repositories/:id/worktrees`)
5. Worktree creation (`POST /api/repositories/:id/worktrees`)
6. Git status and file modification tracking
7. Commit creation and verification

## 3. Review Test Output

Ensure all steps print successful statuses without unhandled exceptions or rejected promises.
