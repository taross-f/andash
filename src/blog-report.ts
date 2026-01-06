import path from "node:path";
import fs from "node:fs";
import type { BlogIdea, BlogInputSource, Language } from "./types";

export interface BlogReportData {
  ideas: BlogIdea[];
  sources: BlogInputSource[];
  topics?: string[];
  summary?: string;
  language: Language;
}

export function generateBlogReportMarkdown(data: BlogReportData): string {
  const { ideas, sources, topics, summary, language } = data;
  const lines: string[] = [];

  const title = language === "ja" ? "テックブログアイデアレポート" : "Tech Blog Ideas Report";
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  // Summary section
  if (summary) {
    const summaryTitle = language === "ja" ? "## 概要" : "## Summary";
    lines.push(summaryTitle);
    lines.push("");
    lines.push(summary);
    lines.push("");
  }

  // Topics section
  if (topics && topics.length > 0) {
    const topicsTitle = language === "ja" ? "## 抽出されたトピック" : "## Extracted Topics";
    lines.push(topicsTitle);
    lines.push("");
    for (const topic of topics) {
      lines.push(`- ${topic}`);
    }
    lines.push("");
  }

  // Input sources section
  const sourcesTitle = language === "ja" ? "## 入力ソース" : "## Input Sources";
  lines.push(sourcesTitle);
  lines.push("");
  for (const source of sources) {
    const typeLabel =
      source.type === "notion"
        ? "Notion"
        : source.type === "slack"
          ? "Slack"
          : language === "ja"
            ? "テーマ"
            : "Theme";
    lines.push(`### ${typeLabel}`);
    lines.push("");
    const preview = source.content.slice(0, 300);
    lines.push(`${preview}${source.content.length > 300 ? "..." : ""}`);
    lines.push("");
  }

  // Ideas section
  const ideasTitle = language === "ja" ? "## ブログアイデア" : "## Blog Ideas";
  lines.push(ideasTitle);
  lines.push("");

  for (let i = 0; i < ideas.length; i++) {
    const idea = ideas[i];
    if (!idea) continue;

    lines.push(`### ${i + 1}. ${idea.title}`);
    lines.push("");

    // Tags
    if (idea.tags.length > 0) {
      lines.push(`**Tags:** ${idea.tags.map((t) => `\`${t}\``).join(" ")}`);
      lines.push("");
    }

    // Summary
    const summaryLabel = language === "ja" ? "**概要:**" : "**Summary:**";
    lines.push(`${summaryLabel} ${idea.summary}`);
    lines.push("");

    // Target audience
    const audienceLabel = language === "ja" ? "**想定読者:**" : "**Target Audience:**";
    lines.push(`${audienceLabel} ${idea.targetAudience}`);
    lines.push("");

    // Read time
    const readTimeLabel = language === "ja" ? "**想定読了時間:**" : "**Estimated Read Time:**";
    lines.push(`${readTimeLabel} ${idea.estimatedReadTime}`);
    lines.push("");

    // Key points
    const keyPointsLabel = language === "ja" ? "**主要ポイント:**" : "**Key Points:**";
    lines.push(keyPointsLabel);
    lines.push("");
    for (const point of idea.keyPoints) {
      lines.push(`- ${point}`);
    }
    lines.push("");

    // Outline (if available)
    if (idea.outline && idea.outline.length > 0) {
      const outlineLabel = language === "ja" ? "**構成案:**" : "**Outline:**";
      lines.push(outlineLabel);
      lines.push("");
      for (let j = 0; j < idea.outline.length; j++) {
        lines.push(`${j + 1}. ${idea.outline[j]}`);
      }
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

export function writeBlogReportFile(outPath: string, markdown: string): string {
  const outputsDir = path.resolve(process.cwd(), "outputs");
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
  }

  const finalPath = outPath.startsWith("/")
    ? outPath
    : path.join(outputsDir, outPath);

  fs.writeFileSync(finalPath, markdown, "utf8");
  return finalPath;
}
