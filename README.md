# CFP Help

カンファレンスのウェブサイトを分析して、Call for Papers (CFP) の提案を自動生成するCLIツールです。

## 概要

CFP Helpは以下の機能を提供します:

- **カンファレンスサイト分析**: 対象カンファレンスのウェブサイトをクロールし、テーマとキーワードを抽出
- **過去情報リサーチ**: 過去のスケジュールや現在のトレンドを検索
- **CFP提案生成**: LLMを活用して、カンファレンスに適したCFP提案を複数生成
- **レポート出力**: 調査結果と提案をまとめたマークダウンレポートを自動作成

## インストール

```bash
# 依存関係をインストール
bun install

# グローバルCLIツールとしてインストール（オプション）
bun link
```

## 使用方法

### 基本的な使用例

```bash
# 開発環境での実行
bun run dev --conf https://example-conference.com --lang ja --num 5

# ビルド後の実行
bun run build
bun start --conf https://example-conference.com --lang ja --num 5

# グローバルインストール後
cfp-help --conf https://example-conference.com --lang ja --num 5
```

### コマンドライン オプション

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

### 実行例

```bash
# Go Conference用のCFP提案を生成
cfp-help --conf https://gocon.jp --num 6 --lang ja

# 過去のカンファレンス情報も含めて分析
cfp-help --conf https://example-conf.com --past https://2023.example-conf.com,https://2022.example-conf.com --num 8
```

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

## 出力

ツールは `outputs/` ディレクトリに以下の形式でレポートを出力します:

```
outputs/cfp_report_conference-name.md
```

レポート内容:
- カンファレンス情報とテーマ分析
- 過去のスケジュール情報
- 最新トレンド調査結果
- 生成されたCFP提案（タイトル、概要、対象者、難易度など）

## 開発

```bash
# 開発サーバー起動
bun run dev

# ビルド
bun run build

# テスト実行
bun test

# テスト（ウォッチモード）
bun run test:watch

# リント
bun run lint

# リント（自動修正）
bun run lint:fix

# フォーマット
bun run format

# 型チェック
bun run typecheck
```

## 技術スタック

- **ランタイム**: Bun (Node.js 18+ 互換)
- **言語**: TypeScript
- **Webクローリング**: axios + cheerio
- **LLM**: OpenAI API / OpenRouter
- **検索**: Tavily API / SerpAPI / DuckDuckGo（フォールバック）
- **並行処理**: p-limit
- **スキーマ検証**: Zod
- **リンター/フォーマッター**: Biome
- **テスト**: Bun Test

## ライセンス

ISC

## 貢献

バグ報告や機能要望はIssueでお知らせください。プルリクエストも歓迎します。