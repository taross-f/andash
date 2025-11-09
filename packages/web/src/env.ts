import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    OPENAI_API_KEY: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default("gpt-4o-mini"),
    OPENAI_BASE_URL: z.string().optional(),
    TAVILY_API_KEY: z.string().optional(),
    SERPAPI_API_KEY: z.string().optional(),
    SEARCH_PROVIDER: z.enum(["auto", "tavily", "serpapi", "duckduckgo"]).default("auto"),
  },
  client: {},
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    SERPAPI_API_KEY: process.env.SERPAPI_API_KEY,
    SEARCH_PROVIDER: process.env.SEARCH_PROVIDER,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
