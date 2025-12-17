import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import type { CrawledPage, CrawlOptions } from "./types";
import { getHost, isSameHost, normalizeUrl, unique } from "./utils";

const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function crawlPages(
  startUrls: string[],
  options: CrawlOptions = {}
): Promise<CrawledPage[]> {
  const maxPages = options.maxPages ?? 10;
  const sameHostOnly = options.sameHostOnly ?? true;
  const timeoutMs = options.timeoutMs ?? 15000;

  const seen = new Set<string>();
  const queue: string[] = [];
  const results: CrawledPage[] = [];

  for (const u of startUrls) {
    const nu = normalizeUrl(u);
    if (!seen.has(nu)) {
      seen.add(nu);
      queue.push(nu);
    }
  }

  const startHosts = unique(startUrls.map((u) => getHost(u)).filter(Boolean) as string[]);
  const limit = pLimit(4);

  async function fetchOne(url: string): Promise<{ page?: CrawledPage; links: string[] }> {
    try {
      const res = await axios.get(url, {
        timeout: timeoutMs,
        headers: { "User-Agent": DEFAULT_UA, Accept: "text/html,application/xhtml+xml" },
        maxRedirects: 3,
      });
      const html = String(res.data);
      const $ = cheerio.load(html);
      const title = ($("title").first().text() || url).trim();

      const headings = ["h1", "h2", "h3"].flatMap((h) =>
        $(h)
          .map((_, el) => $(el).text().trim())
          .get()
      );

      // Extract main text
      const texts: string[] = [];
      $("p, li, h1, h2, h3").each((_, el) => {
        const t = $(el).text().replace(/\s+/g, " ").trim();
        if (t) texts.push(t);
      });
      const text = texts.join("\n");

      // Links
      const links: string[] = $("a[href]")
        .map((_, el) => $(el).attr("href"))
        .get()
        .filter(Boolean)
        .map((href) => new URL(href!, url).toString())
        .map(normalizeUrl);

      const page: CrawledPage = { url, title, text, headings, links };
      return { page, links };
    } catch {
      return { links: [] };
    }
  }

  while (results.length < maxPages && queue.length > 0) {
    const batch = queue.splice(0, 8);
    const promises = batch.map((u) => limit(() => fetchOne(u)));
    const batchResults = await Promise.all(promises);

    for (let i = 0; i < batch.length; i++) {
      const _url = batch[i];
      const result = batchResults[i];
      if (!result) continue;
      const { page, links } = result;
      if (page) results.push(page);

      // Only add more links to queue if we haven't reached the limit yet
      if (results.length < maxPages) {
        for (const link of links || []) {
          if (seen.has(link)) continue;
          if (
            sameHostOnly &&
            startHosts.length > 0 &&
            !startHosts.some((host) => isSameHost(host, link))
          )
            continue;
          seen.add(link);
          queue.push(link);
        }
      }
    }
  }

  return results;
}
