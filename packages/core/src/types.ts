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
