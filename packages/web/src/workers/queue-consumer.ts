import type { Queue, QueueContentType } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import {
  crawlPages,
  extractThemeAndKeywords,
  generateProposals,
  generateReportMarkdown,
  buildScheduleQueries,
  searchWeb,
  slugify,
  type ConferenceInfo,
} from "@cfp-help/core";
import * as schema from "../server/db/schema";

interface Env {
  DB: D1Database;
  REPORTS: R2Bucket;
  OPENAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_BASE_URL?: string;
  TAVILY_API_KEY?: string;
  SERPAPI_API_KEY?: string;
}

interface JobMessage {
  jobId: number;
}

export default {
  async queue(
    batch: QueueBatch<JobMessage>,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const db = drizzle(env.DB, { schema });

    for (const message of batch.messages) {
      const { jobId } = message.body;

      try {
        // Update job status to processing
        await db
          .update(schema.jobs)
          .set({ status: "processing" })
          .where(eq(schema.jobs.id, jobId));

        // Fetch job details
        const job = await db.query.jobs.findFirst({
          where: eq(schema.jobs.id, jobId),
        });

        if (!job) {
          throw new Error(`Job ${jobId} not found`);
        }

        // Set environment variables for core package
        if (env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
        if (env.OPENROUTER_API_KEY) process.env.OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;
        if (env.OPENAI_MODEL) process.env.OPENAI_MODEL = env.OPENAI_MODEL;
        if (env.OPENAI_BASE_URL) process.env.OPENAI_BASE_URL = env.OPENAI_BASE_URL;
        if (env.TAVILY_API_KEY) process.env.TAVILY_API_KEY = env.TAVILY_API_KEY;
        if (env.SERPAPI_API_KEY) process.env.SERPAPI_API_KEY = env.SERPAPI_API_KEY;

        // Process the job using core logic
        const pastUrls = job.pastUrls?.split(",").filter(Boolean) || [];
        const crawledConf = await crawlPages([job.conferenceUrl, ...pastUrls], {
          maxPages: 10,
          sameHostOnly: true,
          timeoutMs: 15000,
        });

        const conf: ConferenceInfo = {
          url: job.conferenceUrl,
          ...(crawledConf[0]?.title ? { title: crawledConf[0].title } : {}),
        };

        const theme = await extractThemeAndKeywords(crawledConf, job.language);
        conf.themeSummary = theme.themeSummary;
        conf.keywords = theme.keywords;

        const scheduleQueries = buildScheduleQueries(job.conferenceUrl);
        const scheduleResults = (
          await Promise.all(scheduleQueries.map((q) => searchWeb(q, "auto", 5)))
        ).flat();

        const scheduleBrief = scheduleResults
          .slice(0, 6)
          .map((r) => `- ${r.title} (${r.url})`)
          .join("\n");

        const trendQuery =
          job.language === "ja"
            ? `${(conf.keywords || []).slice(0, 5).join(" ")} 最新 動向 事例 2025`
            : `${(conf.keywords || []).slice(0, 5).join(" ")} latest trends 2025 case studies`;

        const trendResults = await searchWeb(trendQuery, "auto", 10);

        const proposals = await generateProposals({
          conferenceTitle: conf.title || slugify(conf.url),
          conferenceUrl: conf.url,
          themeSummary: conf.themeSummary || "",
          keywords: conf.keywords || [],
          scheduleBrief,
          trendBrief: trendResults
            .slice(0, 6)
            .map((r) => `- ${r.title} (${r.url})`)
            .join("\n"),
          language: job.language,
          num: job.numProposals,
        });

        const md = generateReportMarkdown({
          conference: conf,
          crawled: crawledConf,
          scheduleResults,
          trendResults,
          proposals,
          language: job.language,
        });

        // Store report in R2
        const reportKey = `${slugify(conf.title || conf.url)}-${jobId}.md`;
        await env.REPORTS.put(reportKey, md);

        // Update job with results
        await db
          .update(schema.jobs)
          .set({
            status: "completed",
            result: JSON.stringify(proposals),
            reportUrl: reportKey,
          })
          .where(eq(schema.jobs.id, jobId));

        message.ack();
      } catch (error) {
        console.error(`Error processing job ${jobId}:`, error);

        await db
          .update(schema.jobs)
          .set({
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
          })
          .where(eq(schema.jobs.id, jobId));

        message.retry();
      }
    }
  },
};

// Type for queue batch
type QueueBatch<T = unknown> = {
  queue: string;
  messages: Array<{
    id: string;
    timestamp: Date;
    body: T;
    ack(): void;
    retry(): void;
  }>;
};
