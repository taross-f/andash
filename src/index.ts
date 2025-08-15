#!/usr/bin/env node
import { Command } from "commander";
import { crawlPages } from "./crawler.js";
import { buildScheduleQueries, searchWeb } from "./search.js";
import { extractThemeAndKeywords, generateProposals } from "./llm.js";
import { generateReportMarkdown, writeReportFile } from "./report.js";
import type { ConferenceInfo, CrawledPage } from "./types.js";
import { slugify } from "./utils.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const program = new Command();
  program
    .name("cfp-help")
    .description("Conference CFP helper CLI")
    .requiredOption("--conf <url>", "Conference URL")
    .option("--past <urls>", "Comma-separated URLs of past conferences")
    .option("--extra <urls>", "Comma-separated extra URLs to include")
    .option("--num <n>", "Number of proposals (5-10)", (v) => parseInt(v, 10), 8)
    .option("--lang <ja|en>", "Language of output", "ja")
    .option("--provider <auto|tavily|serpapi>", "Search provider", "auto")
    .option("--max-pages <n>", "Max pages to crawl", (v) => parseInt(v, 10), 10)
    .option("--timeout <ms>", "Request timeout", (v) => parseInt(v, 10), 15000)
    .option("--out <path>", "Output markdown file path (default under outputs/)")
    .parse(process.argv);

  const opts = program.opts();
  const confUrl: string = opts.conf;
  const pastUrls: string[] = (opts.past ? String(opts.past).split(/[,\s]+/) : []).filter(Boolean);
  const extraUrls: string[] = (opts.extra ? String(opts.extra).split(/[,\s]+/) : []).filter(Boolean);
  const num: number = Math.max(5, Math.min(10, opts.num || 8));
  const language: "ja" | "en" = opts.lang === "en" ? "en" : "ja";

  console.log(`Crawling conference site: ${confUrl}`);
  const crawledConf: CrawledPage[] = await crawlPages([confUrl, ...extraUrls], {
    maxPages: opts.maxPages,
    sameHostOnly: true,
    timeoutMs: opts.timeout,
  });

  const conf: ConferenceInfo = { url: confUrl, ...(crawledConf[0]?.title ? { title: crawledConf[0].title } : {}) };
  console.log("Extracting theme and keywords via LLM...");
  const theme = await extractThemeAndKeywords(crawledConf, language);
  conf.themeSummary = theme.themeSummary;
  conf.keywords = theme.keywords;

  console.log("Searching past schedules/agenda...");
  const scheduleQueries = buildScheduleQueries(confUrl);
  const scheduleResults = (
    await Promise.all(scheduleQueries.map((q) => searchWeb(q, opts.provider, 5)))
  ).flat();

  const scheduleBrief = scheduleResults.slice(0, 6).map((r) => `- ${r.title} (${r.url})`).join("\n");

  // Trend search based on theme keywords
  const trendQuery = language === "ja"
    ? `${(conf.keywords || []).slice(0, 5).join(" ")} 最新 動向 事例 2025`
    : `${(conf.keywords || []).slice(0, 5).join(" ")} latest trends 2025 case studies`;
  console.log(`Searching trends: ${trendQuery}`);
  const trendResults = await searchWeb(trendQuery, opts.provider, 10);

  console.log("Generating CFP proposals via LLM...");
  const proposals = await generateProposals({
    conferenceTitle: conf.title || slugify(conf.url),
    conferenceUrl: conf.url,
    themeSummary: conf.themeSummary || "",
    keywords: conf.keywords || [],
    scheduleBrief,
    trendBrief: trendResults.slice(0, 6).map((r) => `- ${r.title} (${r.url})`).join("\n"),
    language,
    num,
  });

  const md = generateReportMarkdown({
    conference: conf,
    crawled: crawledConf,
    scheduleResults,
    trendResults,
    proposals,
    language,
  });

  const outPath = opts.out || `cfp_report_${slugify(conf.title || conf.url)}`;
  const file = outPath.endsWith(".md") ? outPath : `${outPath}.md`;
  const written = writeReportFile(file, md);
  console.log(`\nWritten: ${written}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
