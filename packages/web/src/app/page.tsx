"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function HomePage() {
  const router = useRouter();
  const [confUrl, setConfUrl] = useState("");
  const [pastUrls, setPastUrls] = useState("");
  const [numProposals, setNumProposals] = useState(8);
  const [language, setLanguage] = useState<"ja" | "en">("ja");

  const createJob = api.job.create.useMutation({
    onSuccess: (data) => {
      router.push(`/jobs/${data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createJob.mutate({
      conferenceUrl: confUrl,
      pastUrls: pastUrls.split(",").map((u) => u.trim()).filter(Boolean),
      numProposals,
      language,
    });
  };

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
            CFP Help
          </h1>
          <Link
            href="/jobs"
            className="rounded-md bg-slate-600 px-4 py-2 text-white hover:bg-slate-700"
          >
            View Jobs
          </Link>
        </div>
        <p className="mb-8 text-center text-slate-600 dark:text-slate-400">
          Generate tailored conference proposal ideas using AI
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-8 shadow-lg dark:bg-slate-800">
          <div>
            <label htmlFor="confUrl" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Conference URL *
            </label>
            <input
              type="url"
              id="confUrl"
              value={confUrl}
              onChange={(e) => setConfUrl(e.target.value)}
              placeholder="https://example-conference.com"
              required
              className="w-full rounded-md border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="pastUrls" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Past Conference URLs (comma-separated)
            </label>
            <input
              type="text"
              id="pastUrls"
              value={pastUrls}
              onChange={(e) => setPastUrls(e.target.value)}
              placeholder="https://past1.com, https://past2.com"
              className="w-full rounded-md border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="numProposals" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Number of Proposals (5-10)
            </label>
            <input
              type="number"
              id="numProposals"
              value={numProposals}
              onChange={(e) => setNumProposals(Number(e.target.value))}
              min={5}
              max={10}
              className="w-full rounded-md border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="language" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as "ja" | "en")}
              className="w-full rounded-md border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="ja">Japanese</option>
              <option value="en">English</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={createJob.isPending}
            className="w-full rounded-md bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-400 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {createJob.isPending ? "Generating..." : "Generate Proposals"}
          </button>

          {createJob.isSuccess && (
            <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
              <p className="text-sm text-green-800 dark:text-green-300">
                Job created successfully! Job ID: {createJob.data.id}
              </p>
            </div>
          )}

          {createJob.isError && (
            <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-300">
                Error: {createJob.error.message}
              </p>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
