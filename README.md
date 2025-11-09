# CFP Help

カンファレンスのウェブサイトを分析して、Call for Papers (CFP) の提案を自動生成するツール。
**CLI版**と**Web版**の両方を提供しています。

## 概要

CFP Helpは以下の機能を提供します:

- **カンファレンスサイト分析**: 対象カンファレンスのウェブサイトをクロールし、テーマとキーワードを抽出
- **過去情報リサーチ**: 過去のスケジュールや現在のトレンドを検索
- **CFP提案生成**: LLMを活用して、カンファレンスに適したCFP提案を複数生成
- **レポート出力**: 調査結果と提案をまとめたマークダウンレポートを自動作成

## プロジェクト構成

このリポジトリはモノレポ構成で、以下のパッケージが含まれています：

```
packages/
├── core/    # 共通ロジック（CLI & Web で共有）
├── cli/     # コマンドラインツール
└── web/     # Webアプリケーション（Next.js + Cloudflare）
```

### packages/core

共通のビジネスロジックを含むパッケージ：
- Webクローリング
- LLM分析
- 検索機能
- レポート生成

### packages/cli

従来のコマンドラインツール。既存のCLIと互換性を保ちながら、`@cfp-help/core`を使用。

### packages/web

モダンなWebアプリケーション。**T3 Stack + Cloudflare**で構築：

**技術スタック:**
- Next.js 15 (App Router)
- tRPC - 型安全なAPI
- Drizzle ORM - データベースORM
- TailwindCSS - スタイリング
- Cloudflare D1 - データベース
- Cloudflare R2 - ストレージ
- Cloudflare Queues - バックグラウンドジョブ処理

詳細は [packages/web/README.md](packages/web/README.md) を参照。

## インストール

```bash
# 依存関係をインストール
pnpm install
```

## 使用方法

### CLI版

```bash
# 開発環境での実行
pnpm dev:cli -- --conf https://example-conference.com --lang ja --num 5

# ビルド
pnpm build:cli

# ビルド後の実行（packages/cliから）
cd packages/cli
node dist/index.js --conf https://example-conference.com --lang ja --num 5
```

#### コマンドライン オプション

| オプション | 必須 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `--conf <url>` | ✓ | - | 対象カンファレンスのURL |
| `--past <urls>` |  | - | 過去のカンファレンスURL（カンマ区切り） |
| `--extra <urls>` |  | - | 追加で分析するURL（カンマ区切り） |
| `--num <n>` |  | 8 | 生成する提案数（5-10） |
| `--lang <ja\|en>` |  | ja | 出力言語 |
| `--provider <auto\|tavily\|serpapi>` |  | auto | 検索プロバイダー |
| `--max-pages <n>` |  | 10 | 最大クロールページ数 |
| `--timeout <ms>` |  | 15000 | リクエストタイムアウト |
| `--out <path>` |  | outputs/ | 出力ファイルパス |

### Web版

```bash
# 開発サーバー起動
pnpm dev:web

# ビルド
pnpm build:web
```

ブラウザで `http://localhost:3000` を開いて使用。

Web版の詳細なセットアップとデプロイ方法は [packages/web/README.md](packages/web/README.md) を参照。

## 設定

環境変数で以下を設定してください:

### 必須設定
```bash
# OpenAI API または OpenRouter API のキー
OPENAI_API_KEY=sk-...
# または
OPENROUTER_API_KEY=sk-or-...
```

### オプション設定
```bash
# 使用するLLMモデル（デフォルト: gpt-4o-mini）
OPENAI_MODEL=gpt-4o-mini

# カスタムAPI URL（OpenRouterでは自動設定）
OPENAI_BASE_URL=https://api.openai.com/v1

# 検索API（どちらかを設定推奨）
TAVILY_API_KEY=tvly-...
SERPAPI_API_KEY=...

# 検索プロバイダーの強制指定
SEARCH_PROVIDER=tavily
```

## 開発

### 全体のビルド
```bash
pnpm build
```

### パッケージ別の開発
```bash
# Core パッケージ
pnpm dev:core

# CLI パッケージ
pnpm dev:cli

# Web パッケージ
pnpm dev:web
```

### テストとリント
```bash
# テスト実行
pnpm test

# リント
pnpm lint

# 型チェック
pnpm typecheck
```

## デプロイ

### CLI版

ローカルでビルドして使用するか、npmパッケージとして公開。

### Web版

Cloudflare Pagesにデプロイ：

```bash
cd packages/web
pnpm build
pnpm pages:deploy
```

詳細は [packages/web/README.md](packages/web/README.md) を参照。

## 技術スタック

### 共通 (Core)
- **言語**: TypeScript
- **Webクローリング**: axios + cheerio
- **LLM**: OpenAI API / OpenRouter
- **検索**: Tavily API / SerpAPI / DuckDuckGo（フォールバック）
- **並行処理**: p-limit
- **スキーマ検証**: Zod

### CLI
- **ランタイム**: Node.js 18+
- **CLIフレームワーク**: Commander.js

### Web
- **フレームワーク**: Next.js 15
- **API**: tRPC
- **データベース**: Drizzle ORM + Cloudflare D1
- **ストレージ**: Cloudflare R2
- **ジョブ処理**: Cloudflare Queues
- **スタイリング**: TailwindCSS

## ライセンス

ISC

## 貢献

バグ報告や機能要望はIssueでお知らせください。プルリクエストも歓迎します。
