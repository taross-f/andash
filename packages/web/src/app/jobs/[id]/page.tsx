"use client";

import { use } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: job, isLoading } = api.job.getById.useQuery({
    id: Number(id),
  });

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="text-center">Loading job details...</div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="text-center">Job not found</div>
      </main>
    );
  }

  const proposals = job.result ? JSON.parse(job.result) : null;

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/jobs"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            ← Back to Jobs
          </Link>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-slate-800">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Job #{job.id}
            </h1>
            <StatusBadge status={job.status} />
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Conference URL
              </label>
              <p className="mt-1">
                <a
                  href={job.conferenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {job.conferenceUrl}
                </a>
              </p>
            </div>

            {job.pastUrls && (
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Past URLs
                </label>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {job.pastUrls}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Proposals
                </label>
                <p className="mt-1 text-slate-900 dark:text-slate-100">
                  {job.numProposals}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Language
                </label>
                <p className="mt-1 text-slate-900 dark:text-slate-100">
                  {job.language === "ja" ? "Japanese" : "English"}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Created
              </label>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                {new Date(job.createdAt).toLocaleString()}
              </p>
            </div>

            {job.error && (
              <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
                <label className="text-sm font-medium text-red-800 dark:text-red-300">
                  Error
                </label>
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                  {job.error}
                </p>
              </div>
            )}

            {job.reportUrl && (
              <div>
                <a
                  href={`/api/reports/${job.reportUrl}`}
                  download
                  className="inline-flex rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                >
                  Download Report
                </a>
              </div>
            )}

            {proposals && (
              <div className="mt-8">
                <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Generated Proposals
                </h2>
                <div className="space-y-6">
                  {proposals.map((proposal: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 p-6 dark:border-slate-700"
                    >
                      <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {proposal.title}
                      </h3>
                      <p className="mb-4 text-slate-600 dark:text-slate-400">
                        {proposal.abstract}
                      </p>
                      <div className="text-sm text-slate-500">
                        <strong>Target Audience:</strong> {proposal.targetAudience}
                      </div>
                      {proposal.keywords && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {proposal.keywords.map((keyword: string, i: number) => (
                            <span
                              key={i}
                              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        colors[status as keyof typeof colors] ?? colors.pending
      }`}
    >
      {status}
    </span>
  );
}
