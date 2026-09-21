# Shiba Code - Antigravity Agent Guidelines

このファイルは Google Antigravity（AGY）が本リポジトリで作業する際の共通コンテキストおよびルールを定義したものです。

---

## 1. プロジェクト概要

- **プロダクト名**: 🐕 Shiba Code
- **目的**: スマホのブラウザから AI コーディングエージェント（Antigravity `agy`, Codex 等）を快適に操作・並列開発できる個人向けリモート開発プラットフォーム。
- **コア機能**:
  - モバイルファーストの Web ターミナル（xterm.js + 補助キーバー）
  - Git Worktree を利用した複数エージェントの独立並列開発
  - 常駐型プロセス管理（接続切断後もバックグラウンドでタスク継続、再接続時にバッファ同期）
  - モバイル Diff レビュー & ワンタップ Commit / Push

---

## 2. アーキテクチャ & モノレポ構造

npm workspaces を用いたモノレポ構成です。

- **`packages/shared`** (`@shiba-code/shared`):
  - 共通の型定義（`types.ts`）や定数。
  - **重要**: `packages/shared` の型を変更・追加した場合、他パッケージから参照する前に必ずビルド（`npm run build --workspace=@shiba-code/shared` またはルートでの `npm run build`）を行う必要があります（`dist/` 参照のため）。
- **`packages/server`** (`@shiba-code/server`):
  - Node.js + Express + WebSocket (`ws`) + simple-git + pty サーバー。
  - Git 操作、Worktree 管理、エージェントセッション管理、認証を担当。
- **`packages/client`** (`@shiba-code/client`):
  - React 19 + TypeScript + Vite + Tailwind CSS + Lucide React + xterm.js。
  - モバイル PWA 対応の UI。

---

## 3. ビルド & テスト手順

コードの変更を行った際は、以下の手順でビルドと動作検証を行ってください。

```bash
# 全パッケージのビルド (shared -> client & server)
npm run build

# 統合検証テスト (E2Eテスト)
npm test
```

※ `npm test` はルート直下の `test-verification.mjs` を実行し、Git リポジトリ初期化・API 疎通・認証・Worktree 操作の自動検証を行います。
コード変更後は必ずビルドと `npm test` が通過することを確認してください。

---

## 4. 開発・実装上の重要ガイドライン

1. **モバイルファースト設計の遵守**:
   - クライアント側（`packages/client`）の UI コンポーネントを修正・追加する際は、スマートフォン（縦画面、片手操作、ソフトウェアキーボード表示時）での操作性を最優先に考慮してください。
   - タップターゲットのサイズ、xterm.js のスクロール挙動、仮想キーバーの配置崩れに留意すること。

2. **Git Worktree 操作の安全性**:
   - Worktree の作成・削除・切り替え時には、未コミットの変更が失われないこと、および Git の lock ファイル競合が発生しないよう配慮してください。

3. **マルチプラットフォーム（Windows / POSIX）配慮**:
   - 開発者の動作環境は Windows (PowerShell) を前提とします。
   - ファイルパスの結合には `path.join` / `path.resolve` を使用し、ハードコードされたスラッシュ/バックスラッシュを避けてください。

4. **型安全性の維持**:
   - サーバーとクライアント間でやり取りするデータやイベント型は、必ず `packages/shared/src/types.ts` で定義し、共通利用してください。
