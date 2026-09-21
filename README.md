# 🐕 Shiba Code

スマホから AI コーディングエージェント（Antigravity `agy`, Codex 等）を快適に操作・並列開発できる個人向けリモート開発プラットフォーム。

---

## 🌟 主な機能

1. **📱 モバイルファースト設計 (PWA 対応)**
   - スマホの縦画面や片手操作に最適化された Web ターミナル（`xterm.js`）。
   - スマホのソフトウェアキーボードでは押しづらいキー（`Ctrl+C`, `Tab`, `↑`, `↓`, `y/n`, `Enter`）を常時配置。
   - 音声入力にも対応したプロンプト入力バーと、ワンタップで送信できるクイックプロンプト候補。
2. **🌿 Git WorkTree による並列開発**
   - 1 つのリポジトリから複数の独立した作業ディレクトリ（Worktree）を瞬時に作成。
   - ブランチを切り替えることなく、複数の AI エージェントを別々のディレクトリで同時に走らせる並列開発が可能。
3. **🤖 常駐型 AI エージェントランナー**
   - WorkTree ごとにバックグラウンドプロセスを常駐管理。
   - スマホの回線切断やバックグラウンド移行が発生しても、サーバー側でタスクは継続実行。
   - 再接続時に最新のログバッファを自動同期。
4. **🔍 モバイル Diff レビュー & ワンタップ Commit / Push**
   - スマホ画面で変更ファイル一覧と Unified Diff を快適に閲覧。
   - コミットメッセージを入力してワンタップで Commit & Push。
5. **🔐 Google 認証 & ホワイトリスト制限**
   - 個人利用専用のアクセス保護。許可された Google アカウント（メールアドレス）のみアクセスを許可。

---

## 🛠️ 技術スタック

- **フロントエンド**: React 19 + TypeScript + Vite + Tailwind CSS + Lucide React + xterm.js
- **バックエンド**: Node.js + TypeScript + Express + WebSocket (`ws`) + simple-git
- **アーキテクチャ**: npm workspaces によるモノレポ構成（`shared`, `server`, `client`）

---

## 🚀 クイックスタート

### 1. 依存関係のインストール & ビルド

```bash
# 依存関係のインストール
npm install

# 全パッケージのビルド (shared, client, server)
npm run build
```

### 2. 環境変数の設定 (任意)

ルートまたは `packages/server/.env` を作成します：

```env
PORT=3001
HOST=0.0.0.0
ALLOWED_EMAILS=your-email@gmail.com
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

_※ `ALLOWED_EMAILS` が空の場合は開発モード（Dev Login）が有効になります。_

### 3. サーバー起動

```bash
# 開発サーバー (フロントエンド: 3000, バックエンド: 3001)
npm run dev

# 本番サーバー (フロントエンド・API・WebSocket が 3001 ポート 1 つで稼働)
npm run build
node packages/server/dist/index.js
```

### 4. 動作検証テスト

```bash
npm test
```

---

## 📱 スマホからのアクセス方法

自宅 PC やローカルサーバー上で Shiba Code を動かし、外出先のスマホから安全に接続するには、以下のいずれかの方法を推奨します：

### 方法 A: Cloudflare Tunnel (おすすめ・無料)

1. `cloudflared` をインストール
2. 次のコマンドを実行してローカルの 3001 ポートを公開：
   ```bash
   cloudflared tunnel --url http://localhost:3001
   ```
3. 表示された `https://xxx.trycloudflare.com` にスマホのブラウザからアクセスし、「ホーム画面に追加」を行うだけで即座にアプリ化できます。

### 方法 B: Tailscale

1. PC とスマホの両方に Tailscale をインストールして同一アカウントでログイン
2. スマホのブラウザから `http://<PCのTailscale-IP>:3001` にアクセス
