import axios from "axios";
import type { SearchResultItem } from "./types.js";
import { getHost } from "./utils.js";

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
}

interface SerpApiResult {
  title?: string;
  link?: string;
  snippet?: string;
}

export async function searchWeb(
  query: string,
  provider: "auto" | "tavily" | "serpapi" = "auto",
  maxResults = 8
): Promise<SearchResultItem[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  const serpKey = process.env.SERPAPI_API_KEY;

  const chosen: "tavily" | "serpapi" | "naive" =
    provider === "tavily"
      ? "tavily"
      : provider === "serpapi"
        ? "serpapi"
        : tavilyKey
          ? "tavily"
          : serpKey
            ? "serpapi"
            : "naive";

  if (chosen === "tavily" && tavilyKey) {
    const res = await axios.post(
      "https://api.tavily.com/search",
      {
        api_key: tavilyKey,
        query,
        max_results: Math.min(10, maxResults),
        search_depth: "advanced",
      },
      { timeout: 15000 }
    );
    const data = res.data || {};
    const items = (data.results || []).slice(0, maxResults).map((r: TavilyResult) => ({
      title: String(r.title || r.url || ""),
      url: String(r.url || ""),
      snippet: r.content ? String(r.content).slice(0, 300) : undefined,
      source: "tavily" as const,
    }));
    return items;
  }

  if (chosen === "serpapi" && serpKey) {
    const res = await axios.get("https://serpapi.com/search.json", {
      params: { engine: "google", q: query, api_key: serpKey, num: Math.min(10, maxResults) },
      timeout: 15000,
    });
    const data = res.data || {};
    const organic = data.organic_results || [];
    return organic.slice(0, maxResults).map((r: SerpApiResult) => ({
      title: String(r.title || r.link || ""),
      url: String(r.link || ""),
      snippet: r.snippet ? String(r.snippet) : undefined,
      source: "serpapi" as const,
    }));
  }

  // naive fallback using DuckDuckGo lite HTML (no key). For prototyping only.
  try {
    const res = await axios.get("https://duckduckgo.com/html/", {
      params: { q: query },
      timeout: 15000,
    });
    const html = String(res.data);
    const matches = Array.from(
      html.matchAll(/<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>(.*?)<\/a>/g)
    );
    return matches.slice(0, maxResults).map((m) => ({
      title: (m[2]?.replace(/<[^>]+>/g, "") || m[1] || "").toString(),
      url: (m[1] || "").toString(),
      snippet: undefined,
      source: "naive" as const,
    }));
  } catch {
    return [];
  }
}

export function buildScheduleQueries(confUrl: string): string[] {
  const host = getHost(confUrl) || "";
  const site = host ? `site:${host}` : "";
  return [
    `${site} schedule`,
    `${site} agenda`,
    `${site} program`,
    `${site} speakers`,
    `${site} timetable`,
  ].filter(Boolean);
}
