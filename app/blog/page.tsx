"use client";

import { useState } from "react";
import { trpc } from "../../lib/trpc";
import type { BlogIdea } from "../../src/types";

export default function BlogPage() {
  const [notionPageId, setNotionPageId] = useState("");
  const [notionDatabaseId, setNotionDatabaseId] = useState("");
  const [notionSearchQuery, setNotionSearchQuery] = useState("");
  const [slackChannelId, setSlackChannelId] = useState("");
  const [slackSearchQuery, setSlackSearchQuery] = useState("");
  const [theme, setTheme] = useState("");
  const [numIdeas, setNumIdeas] = useState(5);
  const [language, setLanguage] = useState<"ja" | "en">("ja");
  const [result, setResult] = useState<{
    ideas: BlogIdea[];
    topics: string[];
    summary: string;
    markdown: string;
  } | null>(null);

  const generateMutation = trpc.blog.generate.useMutation({
    onSuccess: (data) => setResult(data),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notionPageId && !notionDatabaseId && !notionSearchQuery && !slackChannelId && !slackSearchQuery && !theme) {
      alert("少なくとも1つの入力ソースを指定してください");
      return;
    }
    generateMutation.mutate({
      notionPageId: notionPageId || undefined,
      notionDatabaseId: notionDatabaseId || undefined,
      notionSearchQuery: notionSearchQuery || undefined,
      slackChannelId: slackChannelId || undefined,
      slackSearchQuery: slackSearchQuery || undefined,
      theme: theme || undefined,
      numIdeas,
      language,
    });
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Tech Blog Idea Generator</h1>
        <p className="text-gray-600 mb-8">
          Notion、Slack、またはテーマからテックブログのアイデアを生成します
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 mb-8 bg-white p-6 rounded-lg shadow">
          {/* Notion Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Notion</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="notionPageId" className="block text-sm font-medium mb-1">
                  Page ID
                </label>
                <input
                  id="notionPageId"
                  type="text"
                  value={notionPageId}
                  onChange={(e) => setNotionPageId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label htmlFor="notionDatabaseId" className="block text-sm font-medium mb-1">
                  Database ID
                </label>
                <input
                  id="notionDatabaseId"
                  type="text"
                  value={notionDatabaseId}
                  onChange={(e) => setNotionDatabaseId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <div>
              <label htmlFor="notionSearch" className="block text-sm font-medium mb-1">
                Search Query
              </label>
              <input
                id="notionSearch"
                type="text"
                value={notionSearchQuery}
                onChange={(e) => setNotionSearchQuery(e.target.value)}
                placeholder="Search keyword in Notion"
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Slack Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Slack</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="slackChannelId" className="block text-sm font-medium mb-1">
                  Channel ID
                </label>
                <input
                  id="slackChannelId"
                  type="text"
                  value={slackChannelId}
                  onChange={(e) => setSlackChannelId(e.target.value)}
                  placeholder="C0XXXXXXXXX"
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label htmlFor="slackSearch" className="block text-sm font-medium mb-1">
                  Search Query
                </label>
                <input
                  id="slackSearch"
                  type="text"
                  value={slackSearchQuery}
                  onChange={(e) => setSlackSearchQuery(e.target.value)}
                  placeholder="Search keyword in Slack"
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>

          {/* Theme Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Theme / Topic</h2>
            <div>
              <label htmlFor="theme" className="block text-sm font-medium mb-1">
                テーマを直接入力
              </label>
              <textarea
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="例: Kubernetes運用で学んだ教訓、TypeScriptの型パズル、チーム開発のベストプラクティス..."
                rows={3}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex gap-4">
            <div>
              <label htmlFor="num" className="block text-sm font-medium mb-1">
                アイデア数
              </label>
              <input
                id="num"
                type="number"
                min={3}
                max={10}
                value={numIdeas}
                onChange={(e) => setNumIdeas(Number(e.target.value))}
                className="p-2 border rounded w-20"
              />
            </div>

            <div>
              <label htmlFor="lang" className="block text-sm font-medium mb-1">
                言語
              </label>
              <select
                id="lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "ja" | "en")}
                className="p-2 border rounded"
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={generateMutation.isPending}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {generateMutation.isPending ? "生成中..." : "アイデアを生成"}
          </button>
        </form>

        {generateMutation.error && (
          <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
            Error: {generateMutation.error.message}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Summary */}
            {result.summary && (
              <div className="p-4 bg-white rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-2">概要</h2>
                <p className="text-gray-700">{result.summary}</p>
              </div>
            )}

            {/* Topics */}
            {result.topics.length > 0 && (
              <div className="p-4 bg-white rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-2">抽出されたトピック</h2>
                <div className="flex flex-wrap gap-2">
                  {result.topics.map((topic, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ideas */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">ブログアイデア</h2>
              {result.ideas.map((idea, i) => (
                <div key={i} className="p-4 bg-white rounded-lg shadow">
                  <h3 className="text-lg font-medium mb-2">{i + 1}. {idea.title}</h3>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {idea.tags.map((tag, j) => (
                      <span key={j} className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <p className="text-gray-700 mb-3">{idea.summary}</p>

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                    <p><span className="font-medium">想定読者:</span> {idea.targetAudience}</p>
                    <p><span className="font-medium">読了時間:</span> {idea.estimatedReadTime}</p>
                  </div>

                  <div className="mb-3">
                    <p className="font-medium text-sm mb-1">主要ポイント:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {idea.keyPoints.map((point, j) => (
                        <li key={j}>{point}</li>
                      ))}
                    </ul>
                  </div>

                  {idea.outline && idea.outline.length > 0 && (
                    <div>
                      <p className="font-medium text-sm mb-1">構成案:</p>
                      <ol className="list-decimal list-inside text-sm text-gray-600">
                        {idea.outline.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Markdown Report */}
            <div>
              <h2 className="text-xl font-semibold mb-2">Markdownレポート</h2>
              <textarea
                readOnly
                value={result.markdown}
                className="w-full h-64 p-2 font-mono text-sm border rounded bg-white"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
