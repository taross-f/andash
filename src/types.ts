export type Language = "ja" | "en";

export interface CrawlOptions {
  maxPages?: number;
  sameHostOnly?: boolean;
  timeoutMs?: number;
}

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
  headings: string[];
  links: string[];
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet?: string | undefined;
  source: "tavily" | "serpapi" | "naive";
}

export interface ConferenceInfo {
  url: string;
  title?: string;
  themeSummary?: string;
  keywords?: string[];
}

export interface CFPProposal {
  title: string;
  abstract: string;
  targetAudience: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "All";
  rationale?: string | undefined;
  references?: string[] | undefined;
}

// Blog idea generation types
export interface NotionContent {
  pageId: string;
  title: string;
  content: string;
  lastEditedTime?: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
  user?: string;
  timestamp?: string;
}

export interface BlogInputSource {
  type: "notion" | "slack" | "theme";
  content: string;
  metadata?: Record<string, string>;
}

export interface BlogIdea {
  title: string;
  summary: string;
  targetAudience: string;
  keyPoints: string[];
  estimatedReadTime: string;
  tags: string[];
  outline?: string[];
}
