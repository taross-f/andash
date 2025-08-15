import fs from "fs";
import path from "path";
import type { CFPProposal, ConferenceInfo, CrawledPage, SearchResultItem } from "./types.js";
import { slugify } from "./utils.js";

export function generateReportMarkdown(
  opts: {
    conference: ConferenceInfo;
    crawled: CrawledPage[];
    scheduleResults: SearchResultItem[];
    trendResults: SearchResultItem[];
    proposals: CFPProposal[];
    language: "ja" | "en";
  }
): string {
  const { conference, crawled, scheduleResults, trendResults, proposals, language } = opts;
  const title = conference.title || crawled[0]?.title || conference.url;

  const lines: string[] = [];
  lines.push(`# CFP提案レポート — ${title}`);
  lines.push("");
  lines.push(`対象カンファレンス: ${conference.url}`);
  if (conference.themeSummary) lines.push(`テーマ要約: ${conference.themeSummary}`);
  if (conference.keywords?.length) lines.push(`キーワード: ${conference.keywords.join(", ")}`);
  lines.push("");
  lines.push("## 提案一覧");
  lines.push("");
  proposals.forEach((p, i) => {
    lines.push(`### ${i + 1}. ${p.title}`);
    lines.push("");
    lines.push((language === "ja" ? "概要" : "Abstract") + ":");
    lines.push("");
    lines.push(p.abstract);
    lines.push("");
    lines.push((language === "ja" ? "想定聴衆" : "Target audience") + `: ${p.targetAudience}`);
    lines.push((language === "ja" ? "難易度" : "Difficulty") + `: ${p.difficulty}`);
    if (p.rationale) lines.push((language === "ja" ? "根拠" : "Rationale") + `: ${p.rationale}`);
    if (p.references?.length) {
      lines.push((language === "ja" ? "参考URL" : "References") + ":");
      p.references.forEach((u) => lines.push(`- ${u}`));
    }
    lines.push("");
  });

  lines.push("## 収集ソース");
  lines.push("");
  if (scheduleResults.length) {
    lines.push("### 過去スケジュール/アジェンダの候補");
    scheduleResults.forEach((r) => lines.push(`- ${r.title} — ${r.url}`));
    lines.push("");
  }
  if (trendResults.length) {
    lines.push("### 最新トレンド候補");
    trendResults.forEach((r) => lines.push(`- ${r.title} — ${r.url}`));
    lines.push("");
  }

  // Include crawled pages for traceability
  lines.push("### クロールページ一覧");
  crawled.slice(0, 20).forEach((p) => lines.push(`- ${p.title} — ${p.url}`));

  return lines.join("\n");
}

export function writeReportFile(baseName: string, content: string): string {
  const outDir = path.join(process.cwd(), "outputs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const slug = slugify(baseName || "report");
  const filePath = path.join(outDir, `${slug}.md`);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}
