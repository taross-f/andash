"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

export default function JobsPage() {
  const { data: jobs, isLoading } = api.job.getAll.useQuery();

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="text-center">Loading jobs...</div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            All Jobs
          </h1>
          <Link
            href="/"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Create New Job
          </Link>
        </div>

        <div className="space-y-4">
          {jobs?.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg dark:bg-slate-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {job.conferenceUrl}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {job.numProposals} proposals • {job.language}
                  </p>
                </div>
                <div className="ml-4">
                  <StatusBadge status={job.status} />
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Created: {new Date(job.createdAt).toLocaleString()}
              </div>
            </Link>
          ))}

          {jobs?.length === 0 && (
            <div className="rounded-lg bg-slate-100 p-8 text-center dark:bg-slate-800">
              <p className="text-slate-600 dark:text-slate-400">
                No jobs yet. Create your first one!
              </p>
            </div>
          )}
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
