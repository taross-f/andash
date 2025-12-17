"use client";

import { useState } from "react";
import { trpc } from "../lib/trpc";
import type { CFPProposal } from "../src/types";

export default function Home() {
  const [url, setUrl] = useState("");
  const [numProposals, setNumProposals] = useState(8);
  const [language, setLanguage] = useState<"ja" | "en">("ja");
  const [result, setResult] = useState<{
    conference: { title?: string; themeSummary?: string; keywords?: string[] };
    proposals: CFPProposal[];
    markdown: string;
  } | null>(null);

  const generateMutation = trpc.cfp.generate.useMutation({
    onSuccess: (data) => setResult(data),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    generateMutation.mutate({
      conferenceUrl: url,
      numProposals,
      language,
    });
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">CFP Help</h1>

        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div>
            <label htmlFor="url" className="block text-sm font-medium mb-1">
              Conference URL
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://conference.example.com"
              required
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex gap-4">
            <div>
              <label htmlFor="num" className="block text-sm font-medium mb-1">
                Number of Proposals
              </label>
              <input
                id="num"
                type="number"
                min={5}
                max={10}
                value={numProposals}
                onChange={(e) => setNumProposals(Number(e.target.value))}
                className="p-2 border rounded"
              />
            </div>

            <div>
              <label htmlFor="lang" className="block text-sm font-medium mb-1">
                Language
              </label>
              <select
                id="lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "ja" | "en")}
                className="p-2 border rounded"
              >
                <option value="ja">Japanese</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={generateMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {generateMutation.isPending ? "Generating..." : "Generate Proposals"}
          </button>
        </form>

        {generateMutation.error && (
          <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
            Error: {generateMutation.error.message}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="p-4 bg-white rounded shadow">
              <h2 className="text-xl font-semibold mb-2">
                {result.conference.title || "Conference"}
              </h2>
              {result.conference.themeSummary && (
                <p className="text-gray-700 mb-2">{result.conference.themeSummary}</p>
              )}
              {result.conference.keywords && (
                <div className="flex flex-wrap gap-2">
                  {result.conference.keywords.map((kw) => (
                    <span key={kw} className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Generated Proposals</h3>
              {result.proposals.map((proposal, i) => (
                <div key={i} className="p-4 bg-white rounded shadow">
                  <h4 className="font-medium mb-2">{proposal.title}</h4>
                  <p className="text-gray-700 mb-2">{proposal.abstract}</p>
                  <div className="text-sm text-gray-600">
                    <p>Target: {proposal.targetAudience}</p>
                    <p>Difficulty: {proposal.difficulty}</p>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Markdown Report</h3>
              <textarea
                readOnly
                value={result.markdown}
                className="w-full h-64 p-2 font-mono text-sm border rounded"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
