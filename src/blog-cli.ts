#!/usr/bin/env node
import { Command } from "commander";
import dotenv from "dotenv";
import { extractKeyTopics, generateBlogIdeas } from "./blog-llm";
import { generateBlogReportMarkdown, writeBlogReportFile } from "./blog-report";
import { fetchNotionDatabase, fetchNotionPage, searchNotion } from "./notion";
import { fetchChannelMessages, searchSlackMessages } from "./slack";
import type { BlogInputSource, Language } from "./types";
import { slugify } from "./utils";

dotenv.config();

async function main() {
  const program = new Command();
  program
    .name("blog-help")
    .description("Tech blog idea generator CLI - Generate blog ideas from Notion, Slack, or themes")
    .option("--notion-page <pageId>", "Notion page ID to fetch content from")
    .option("--notion-db <databaseId>", "Notion database ID to fetch pages from")
    .option("--notion-search <query>", "Search Notion for relevant pages")
    .option("--slack-channel <channelId>", "Slack channel ID to fetch messages from")
    .option("--slack-search <query>", "Search Slack messages")
    .option("--theme <theme>", "Direct theme or topic to generate ideas about")
    .option("--num <n>", "Number of ideas to generate (3-10)", (v) => Number.parseInt(v, 10), 5)
    .option("--lang <ja|en>", "Language of output", "ja")
    .option("--out <path>", "Output markdown file path (default under outputs/)")
    .parse(process.argv);

  const opts = program.opts();
  const language: Language = opts.lang === "en" ? "en" : "ja";
  const num: number = Math.max(3, Math.min(10, opts.num || 5));

  const sources: BlogInputSource[] = [];

  // Collect from Notion
  if (opts.notionPage) {
    console.log(`Fetching Notion page: ${opts.notionPage}`);
    try {
      const page = await fetchNotionPage(opts.notionPage);
      sources.push({
        type: "notion",
        content: `# ${page.title}\n\n${page.content}`,
        metadata: { pageId: page.pageId, title: page.title },
      });
      console.log(`  Fetched: ${page.title || "Untitled"}`);
    } catch (err) {
      console.error(`  Failed to fetch Notion page: ${err}`);
    }
  }

  if (opts.notionDb) {
    console.log(`Fetching Notion database: ${opts.notionDb}`);
    try {
      const pages = await fetchNotionDatabase(opts.notionDb);
      for (const page of pages) {
        sources.push({
          type: "notion",
          content: `# ${page.title}\n\n${page.content}`,
          metadata: { pageId: page.pageId, title: page.title },
        });
      }
      console.log(`  Fetched ${pages.length} pages`);
    } catch (err) {
      console.error(`  Failed to fetch Notion database: ${err}`);
    }
  }

  if (opts.notionSearch) {
    console.log(`Searching Notion: ${opts.notionSearch}`);
    try {
      const pages = await searchNotion(opts.notionSearch);
      for (const page of pages) {
        sources.push({
          type: "notion",
          content: `# ${page.title}\n\n${page.content}`,
          metadata: { pageId: page.pageId, title: page.title },
        });
      }
      console.log(`  Found ${pages.length} pages`);
    } catch (err) {
      console.error(`  Failed to search Notion: ${err}`);
    }
  }

  // Collect from Slack
  if (opts.slackChannel) {
    console.log(`Fetching Slack channel: ${opts.slackChannel}`);
    try {
      const messages = await fetchChannelMessages(opts.slackChannel, 50);
      const content = messages
        .map((m) => m.text)
        .filter(Boolean)
        .join("\n\n");
      sources.push({
        type: "slack",
        content,
        metadata: { channel: opts.slackChannel },
      });
      console.log(`  Fetched ${messages.length} messages`);
    } catch (err) {
      console.error(`  Failed to fetch Slack channel: ${err}`);
    }
  }

  if (opts.slackSearch) {
    console.log(`Searching Slack: ${opts.slackSearch}`);
    try {
      const messages = await searchSlackMessages(opts.slackSearch, 30);
      const content = messages
        .map((m) => m.text)
        .filter(Boolean)
        .join("\n\n");
      sources.push({
        type: "slack",
        content,
        metadata: { query: opts.slackSearch },
      });
      console.log(`  Found ${messages.length} messages`);
    } catch (err) {
      console.error(`  Failed to search Slack: ${err}`);
    }
  }

  // Add direct theme
  if (opts.theme) {
    sources.push({
      type: "theme",
      content: opts.theme,
    });
  }

  if (sources.length === 0) {
    console.error("Error: At least one input source is required.");
    console.error("Use --notion-page, --notion-db, --notion-search, --slack-channel, --slack-search, or --theme");
    process.exit(1);
  }

  console.log("\nExtracting key topics...");
  const { topics, summary } = await extractKeyTopics(sources, language);
  console.log(`  Found ${topics.length} topics`);

  console.log("\nGenerating blog ideas...");
  const ideas = await generateBlogIdeas({
    sources,
    theme: opts.theme,
    language,
    num,
  });
  console.log(`  Generated ${ideas.length} ideas`);

  const markdown = generateBlogReportMarkdown({
    ideas,
    sources,
    topics,
    summary,
    language,
  });

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outName = opts.out || `blog_ideas_${timestamp}_${slugify(opts.theme || "report")}`;
  const file = outName.endsWith(".md") ? outName : `${outName}.md`;
  const written = writeBlogReportFile(file, markdown);

  console.log(`\nWritten: ${written}`);
  console.log("\n=== Generated Ideas ===");
  for (let i = 0; i < ideas.length; i++) {
    const idea = ideas[i];
    if (idea) {
      console.log(`\n${i + 1}. ${idea.title}`);
      console.log(`   ${idea.summary.slice(0, 80)}...`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
