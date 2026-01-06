/**
 * Shared Blog idea generation service - used by both CLI and Web app
 */
import { extractKeyTopics, generateBlogIdeas } from "../src/blog-llm";
import { generateBlogReportMarkdown } from "../src/blog-report";
import { fetchNotionDatabase, fetchNotionPage, searchNotion } from "../src/notion";
import { fetchChannelMessages, searchSlackMessages } from "../src/slack";
import type { BlogIdea, BlogInputSource, Language } from "../src/types";

export interface BlogGenerationInput {
  // Notion inputs
  notionPageId?: string;
  notionDatabaseId?: string;
  notionSearchQuery?: string;

  // Slack inputs
  slackChannelId?: string;
  slackSearchQuery?: string;

  // Direct theme input
  theme?: string;

  // Options
  numIdeas?: number;
  language?: Language;
}

export interface BlogGenerationResult {
  ideas: BlogIdea[];
  sources: BlogInputSource[];
  topics: string[];
  summary: string;
  markdown: string;
}

export interface BlogGenerationProgress {
  stage: "collecting" | "analyzing" | "generating" | "complete";
  message: string;
  percentage: number;
}

export type ProgressCallback = (progress: BlogGenerationProgress) => void;

export async function generateBlogIdeaReport(
  input: BlogGenerationInput,
  onProgress?: ProgressCallback
): Promise<BlogGenerationResult> {
  const { numIdeas = 5, language = "ja" } = input;

  const num = Math.max(3, Math.min(10, numIdeas));
  const sources: BlogInputSource[] = [];

  // Stage 1: Collecting sources
  onProgress?.({
    stage: "collecting",
    message: "Collecting input sources...",
    percentage: 10,
  });

  // Collect from Notion
  if (input.notionPageId) {
    try {
      const page = await fetchNotionPage(input.notionPageId);
      sources.push({
        type: "notion",
        content: `# ${page.title}\n\n${page.content}`,
        metadata: { pageId: page.pageId, title: page.title },
      });
    } catch {
      // Skip failed pages
    }
  }

  if (input.notionDatabaseId) {
    try {
      const pages = await fetchNotionDatabase(input.notionDatabaseId);
      for (const page of pages) {
        sources.push({
          type: "notion",
          content: `# ${page.title}\n\n${page.content}`,
          metadata: { pageId: page.pageId, title: page.title },
        });
      }
    } catch {
      // Skip on error
    }
  }

  if (input.notionSearchQuery) {
    try {
      const pages = await searchNotion(input.notionSearchQuery);
      for (const page of pages) {
        sources.push({
          type: "notion",
          content: `# ${page.title}\n\n${page.content}`,
          metadata: { pageId: page.pageId, title: page.title },
        });
      }
    } catch {
      // Skip on error
    }
  }

  // Collect from Slack
  if (input.slackChannelId) {
    try {
      const messages = await fetchChannelMessages(input.slackChannelId, 50);
      const content = messages
        .map((m) => m.text)
        .filter(Boolean)
        .join("\n\n");
      sources.push({
        type: "slack",
        content,
        metadata: { channel: input.slackChannelId },
      });
    } catch {
      // Skip on error
    }
  }

  if (input.slackSearchQuery) {
    try {
      const messages = await searchSlackMessages(input.slackSearchQuery, 30);
      const content = messages
        .map((m) => m.text)
        .filter(Boolean)
        .join("\n\n");
      sources.push({
        type: "slack",
        content,
        metadata: { query: input.slackSearchQuery },
      });
    } catch {
      // Skip on error
    }
  }

  // Add direct theme
  if (input.theme) {
    sources.push({
      type: "theme",
      content: input.theme,
    });
  }

  if (sources.length === 0) {
    throw new Error("At least one input source is required");
  }

  // Stage 2: Analyzing topics
  onProgress?.({
    stage: "analyzing",
    message: "Extracting key topics...",
    percentage: 40,
  });

  const { topics, summary } = await extractKeyTopics(sources, language);

  // Stage 3: Generating ideas
  onProgress?.({
    stage: "generating",
    message: "Generating blog ideas...",
    percentage: 70,
  });

  const ideas = await generateBlogIdeas({
    sources,
    theme: input.theme,
    language,
    num,
  });

  // Stage 4: Complete
  onProgress?.({
    stage: "complete",
    message: "Generation complete!",
    percentage: 100,
  });

  const markdown = generateBlogReportMarkdown({
    ideas,
    sources,
    topics,
    summary,
    language,
  });

  return {
    ideas,
    sources,
    topics,
    summary,
    markdown,
  };
}
