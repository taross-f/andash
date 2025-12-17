/**
 * Shared CFP generation service - used by both CLI and Web app
 */
import { crawlPages } from "../src/crawler";
import { extractThemeAndKeywords, generateProposals } from "../src/llm";
import { generateReportMarkdown } from "../src/report";
import { buildScheduleQueries, searchWeb } from "../src/search";
import type {
  CFPProposal,
  ConferenceInfo,
  CrawledPage,
  Language,
  SearchResultItem,
} from "../src/types";
import { slugify } from "../src/utils";

export interface CFPGenerationInput {
  conferenceUrl: string;
  extraUrls?: string[];
  numProposals?: number;
  language?: Language;
  searchProvider?: "auto" | "tavily" | "serpapi";
  maxPages?: number;
  timeoutMs?: number;
}

export interface CFPGenerationResult {
  conference: ConferenceInfo;
  crawled: CrawledPage[];
  scheduleResults: SearchResultItem[];
  trendResults: SearchResultItem[];
  proposals: CFPProposal[];
  markdown: string;
}

export interface CFPGenerationProgress {
  stage: "crawling" | "analyzing" | "searching" | "generating" | "complete";
  message: string;
  percentage: number;
}

export type ProgressCallback = (progress: CFPGenerationProgress) => void;

export async function generateCFPProposals(
  input: CFPGenerationInput,
  onProgress?: ProgressCallback
): Promise<CFPGenerationResult> {
  const {
    conferenceUrl,
    extraUrls = [],
    numProposals = 8,
    language = "ja",
    searchProvider = "auto",
    maxPages = 10,
    timeoutMs = 15000,
  } = input;

  const num = Math.max(5, Math.min(10, numProposals));

  // Stage 1: Crawling
  onProgress?.({
    stage: "crawling",
    message: `Crawling conference site: ${conferenceUrl}`,
    percentage: 10,
  });

  const crawledConf: CrawledPage[] = await crawlPages([conferenceUrl, ...extraUrls], {
    maxPages,
    sameHostOnly: true,
    timeoutMs,
  });

  const conf: ConferenceInfo = {
    url: conferenceUrl,
    ...(crawledConf[0]?.title ? { title: crawledConf[0].title } : {}),
  };

  // Stage 2: Theme Analysis
  onProgress?.({
    stage: "analyzing",
    message: "Extracting theme and keywords via LLM...",
    percentage: 30,
  });

  const theme = await extractThemeAndKeywords(crawledConf, language);
  conf.themeSummary = theme.themeSummary;
  conf.keywords = theme.keywords;

  // Stage 3: Searching
  onProgress?.({
    stage: "searching",
    message: "Searching past schedules and trends...",
    percentage: 50,
  });

  const scheduleQueries = buildScheduleQueries(conferenceUrl);
  const scheduleResults = (
    await Promise.all(scheduleQueries.map((q) => searchWeb(q, searchProvider, 5)))
  ).flat();

  const scheduleBrief = scheduleResults
    .slice(0, 6)
    .map((r) => `- ${r.title} (${r.url})`)
    .join("\n");

  const trendQuery =
    language === "ja"
      ? `${(conf.keywords || []).slice(0, 5).join(" ")} 最新 動向 事例 2025`
      : `${(conf.keywords || []).slice(0, 5).join(" ")} latest trends 2025 case studies`;

  const trendResults = await searchWeb(trendQuery, searchProvider, 10);

  // Stage 4: Generating Proposals
  onProgress?.({
    stage: "generating",
    message: "Generating CFP proposals via LLM...",
    percentage: 70,
  });

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
    language,
    num,
  });

  // Stage 5: Generate Report
  onProgress?.({
    stage: "complete",
    message: "Generation complete!",
    percentage: 100,
  });

  const markdown = generateReportMarkdown({
    conference: conf,
    crawled: crawledConf,
    scheduleResults,
    trendResults,
    proposals,
    language,
  });

  return {
    conference: conf,
    crawled: crawledConf,
    scheduleResults,
    trendResults,
    proposals,
    markdown,
  };
}
