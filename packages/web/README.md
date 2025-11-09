# CFP Help Web

Web版のCFP Help - カンファレンス提案生成ツール。T3 Stack + Cloudflareで構築されたモダンなWebアプリケーション。

## 技術スタック

### フロントエンド
- **Next.js 15** (App Router) - React フレームワーク
- **TypeScript** - 型安全性
- **TailwindCSS** - スタイリング
- **tRPC** - 型安全なAPI通信
- **React Query** - データフェッチング

### バックエンド
- **tRPC** - 型安全なAPI層
- **Drizzle ORM** - データベースORM
- **Cloudflare D1** - SQLiteベースのデータベース
- **Cloudflare R2** - オブジェクトストレージ
- **Cloudflare Queues** - バックグラウンドジョブ処理

## セットアップ

### 1. 依存関係のインストール

```bash
# ルートディレクトリから
pnpm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env`ファイルを編集して、必要なAPIキーを設定：

```env
OPENAI_API_KEY=your-openai-api-key
TAVILY_API_KEY=your-tavily-api-key
```

### 3. Cloudflareリソースの作成

#### D1データベースの作成

```bash
cd packages/web
wrangler d1 create cfp-help-db
```

出力されたdatabase_idを`wrangler.toml`に追加。

#### R2バケットの作成

```bash
wrangler r2 bucket create cfp-help-reports
```

#### Queuesの作成

```bash
wrangler queues create cfp-help-jobs
```

### 4. データベースマイグレーション

```bash
# マイグレーションファイルの生成
pnpm db:generate

# ローカル環境でマイグレーション実行
pnpm db:migrate

# 本番環境でマイグレーション実行
wrangler d1 migrations apply cfp-help-db
```

## 開発

### ローカル開発サーバー

```bash
# Next.js開発サーバー
pnpm dev

# または、Cloudflare Pages環境で実行
pnpm pages:dev
```

### データベース管理

```bash
# Drizzle Studioでデータベースを管理
pnpm db:studio
```

## デプロイ

### Cloudflare Pagesへのデプロイ

1. Cloudflare Dashboardでプロジェクト作成
2. 環境変数を設定
3. デプロイ

```bash
pnpm build
pnpm pages:deploy
```

### 環境変数の設定（本番環境）

Cloudflare Dashboardで以下の環境変数を設定：

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (デフォルト: gpt-4o-mini)
- `TAVILY_API_KEY` または `SERPAPI_API_KEY`
- `SEARCH_PROVIDER` (auto/tavily/serpapi)

### バインディングの設定

`wrangler.toml`で設定されたバインディング：

- **D1 Database**: `DB` → `cfp-help-db`
- **R2 Bucket**: `REPORTS` → `cfp-help-reports`
- **Queue**: `JOB_QUEUE` → `cfp-help-jobs`

## アーキテクチャ

### データフロー

1. **ユーザー入力** → フロントエンドフォーム
2. **ジョブ作成** → tRPC API → D1データベースに保存
3. **キュー送信** → Cloudflare Queuesにジョブを追加
4. **バックグラウンド処理** → Queue Consumer Workerが実行
   - `@cfp-help/core`のロジックを使用
   - カンファレンスサイトをクロール
   - LLMで分析・提案生成
5. **結果保存** → D1（メタデータ）+ R2（レポートファイル）
6. **結果表示** → ジョブ詳細ページで表示・ダウンロード

### ディレクトリ構造

```
packages/web/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── page.tsx      # ホームページ（ジョブ作成）
│   │   ├── jobs/         # ジョブ一覧・詳細
│   │   └── api/          # API Routes
│   ├── components/       # Reactコンポーネント
│   ├── server/
│   │   ├── api/          # tRPC routers
│   │   └── db/           # Drizzle schema
│   ├── trpc/             # tRPC client/server設定
│   ├── workers/          # Cloudflare Workers
│   │   └── queue-consumer.ts
│   └── env.ts            # 環境変数バリデーション
├── drizzle/              # DB migrations
└── wrangler.toml         # Cloudflare設定
```

## スクリプト

```bash
# 開発
pnpm dev              # Next.js開発サーバー
pnpm pages:dev        # Cloudflare Pages環境で開発

# ビルド
pnpm build            # Next.jsビルド
pnpm typecheck        # 型チェック
pnpm lint             # ESLint

# データベース
pnpm db:generate      # マイグレーションファイル生成
pnpm db:migrate       # マイグレーション実行（ローカル）
pnpm db:studio        # Drizzle Studio起動

# デプロイ
pnpm pages:deploy     # Cloudflare Pagesにデプロイ
```

## トラブルシューティング

### ローカル開発でD1が動かない

Cloudflare Pages開発環境を使用：

```bash
pnpm pages:dev
```

### Queueが処理されない

Queue Consumer Workerが正しくデプロイされているか確認：

```bash
wrangler queues consumer list cfp-help-jobs
```

### R2からレポートをダウンロードできない

R2バインディングが正しく設定されているか確認。
