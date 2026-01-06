import axios from "axios";
import type { NotionContent } from "./types";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function getNotionClient() {
  const token = process.env.NOTION_API_KEY;
  if (!token) {
    throw new Error("NOTION_API_KEY is required for Notion integration");
  }
  return axios.create({
    baseURL: NOTION_API_BASE,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
  });
}

function extractTextFromBlock(block: Record<string, unknown>): string {
  const blockType = block.type as string;
  const blockData = block[blockType] as Record<string, unknown> | undefined;
  if (!blockData) return "";

  const richText = blockData.rich_text as Array<{ plain_text?: string }> | undefined;
  if (richText && Array.isArray(richText)) {
    return richText.map((t) => t.plain_text || "").join("");
  }
  return "";
}

export async function fetchNotionPage(pageId: string): Promise<NotionContent> {
  const client = getNotionClient();

  // Get page metadata
  const pageResp = await client.get(`/pages/${pageId}`);
  const pageData = pageResp.data as {
    properties?: Record<string, { title?: Array<{ plain_text?: string }> }>;
    last_edited_time?: string;
  };

  let title = "";
  const properties = pageData.properties || {};
  for (const prop of Object.values(properties)) {
    if (prop.title && Array.isArray(prop.title)) {
      title = prop.title.map((t) => t.plain_text || "").join("");
      break;
    }
  }

  // Get page blocks (content)
  const blocksResp = await client.get(`/blocks/${pageId}/children`);
  const blocksData = blocksResp.data as { results?: Array<Record<string, unknown>> };
  const blocks = blocksData.results || [];
  const contentParts: string[] = [];

  for (const block of blocks) {
    const text = extractTextFromBlock(block);
    if (text) {
      contentParts.push(text);
    }
  }

  return {
    pageId,
    title,
    content: contentParts.join("\n"),
    lastEditedTime: pageData.last_edited_time,
  };
}

export async function fetchNotionDatabase(databaseId: string): Promise<NotionContent[]> {
  const client = getNotionClient();

  const queryResp = await client.post(`/databases/${databaseId}/query`, {
    page_size: 20,
  });

  const queryData = queryResp.data as { results?: Array<{ id?: string }> };
  const pages = queryData.results || [];
  const contents: NotionContent[] = [];

  for (const page of pages) {
    if (page.id) {
      try {
        const content = await fetchNotionPage(page.id);
        contents.push(content);
      } catch {
        // Skip failed pages
      }
    }
  }

  return contents;
}

export async function searchNotion(query: string): Promise<NotionContent[]> {
  const client = getNotionClient();

  const searchResp = await client.post("/search", {
    query,
    filter: { property: "object", value: "page" },
    page_size: 10,
  });

  const searchData = searchResp.data as { results?: Array<{ id?: string }> };
  const pages = searchData.results || [];
  const contents: NotionContent[] = [];

  for (const page of pages) {
    if (page.id) {
      try {
        const content = await fetchNotionPage(page.id);
        contents.push(content);
      } catch {
        // Skip failed pages
      }
    }
  }

  return contents;
}
