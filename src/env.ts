import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export function getOpenAIClient(): OpenAI {
  // Prefer OPENAI_API_KEY; fallback to OPENROUTER_API_KEY with baseURL
  const openAIKey = process.env.OPENAI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || (openRouterKey ? "https://openrouter.ai/api/v1" : undefined);
  const apiKey = openAIKey || openRouterKey;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY または OPENROUTER_API_KEY が必要です");
  }
  return new OpenAI({ apiKey, baseURL });
}

export function getSearchProvider(): "auto" | "tavily" | "serpapi" {
  const v = (process.env.SEARCH_PROVIDER || "auto").toLowerCase();
  if (v === "tavily" || v === "serpapi") return v;
  return "auto";
}
