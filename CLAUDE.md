# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリのコードを扱う際のガイダンスを提供します。

## 概要

CFP Help は、カンファレンスのウェブサイトを分析してCall for Papers (CFP) の提案を生成するCLIツールです。カンファレンスサイトをクロールし、LLM分析を使ってテーマとキーワードを抽出し、過去のカンファレンススケジュールやトレンドを検索して、そのカンファレンスに合わせた複数のCFP提案を生成します。

## 開発コマンド

```bash
# 開発（ビルドなしで実行）
npm run dev

# TypeScriptをdist/にビルド
npm run build

# ビルド版を実行
npm start

# グローバルCLIツールとしてインストール
npm link
```

## アーキテクチャ

### コアフロー
1. **Webクローリング** (`crawler.ts`) - Cheerioを使ってカンファレンスサイトをクロールし、コンテンツを抽出
2. **テーマ分析** (`llm.ts`) - OpenAIを使ってクロールしたコンテンツからカンファレンステーマとキーワードを抽出
3. **リサーチ** (`search.ts`) - Tavily/SerpAPI/DuckDuckGoを使って過去のスケジュールと現在のトレンドを検索
4. **提案生成** (`llm.ts`) - JSON schema検証付きでLLMを使って構造化されたCFP提案を生成
5. **レポート出力** (`report.ts`) - すべての調査結果と提案をまとめたマークダウンレポートを作成

### 主要コンポーネント

- **マルチプロバイダー検索**: Tavily、SerpAPI、DuckDuckGoによるフォールバック検索をサポート
- **並行処理**: p-limitを使った制御されたパラレルWebリクエスト
- **スキーマ検証**: ZodによるCFP提案構造の厳密な検証
- **堅牢なLLM統合**: JSON解析の失敗処理と正確な提案数のリトライ機能
- **柔軟なAPIサポート**: OpenAI APIまたはOpenRouterによるモデルアクセスに対応

### 設定

環境変数:
- `OPENAI_API_KEY` または `OPENROUTER_API_KEY` - LLM APIアクセス
- `OPENAI_MODEL` - 使用するモデル（デフォルト: gpt-4o-mini）
- `OPENAI_BASE_URL` - カスタムAPIエンドポイント（OpenRouterでは自動設定）
- `TAVILY_API_KEY` または `SERPAPI_API_KEY` - 検索プロバイダーのAPIキー
- `SEARCH_PROVIDER` - 特定の検索プロバイダーを強制指定（auto/tavily/serpapi）

### CLI使用パターン

```bash
cfp-help --conf <conference-url> --past <past-urls> --num 8 --lang ja
```

ツールは `outputs/` ディレクトリにカンファレンス分析と生成されたCFP提案のマークダウンレポートを出力します。

### TypeScript設定

Node.js 18+をターゲットとしたES modulesでの厳密なTypeScript設定を使用。主要な厳密オプション:
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes` 
- `verbatimModuleSyntax`
- `isolatedModules`