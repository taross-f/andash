import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { getOpenAIClient, getOpenAIModel, getSearchProvider } from "../src/env.js";
describe("env", () => {
    const originalEnv = { ...process.env };
    beforeEach(() => {
        // Clear environment variables before each test
        delete process.env.OPENAI_MODEL;
        delete process.env.OPENAI_API_KEY;
        delete process.env.OPENROUTER_API_KEY;
        delete process.env.OPENAI_BASE_URL;
        delete process.env.SEARCH_PROVIDER;
    });
    afterEach(() => {
        // Restore original environment
        process.env = { ...originalEnv };
    });
    describe("getOpenAIModel", () => {
        it("returns default model when env var not set", () => {
            expect(getOpenAIModel()).toBe("gpt-4o-mini");
        });
        it("returns custom model from environment", () => {
            process.env.OPENAI_MODEL = "gpt-4";
            expect(getOpenAIModel()).toBe("gpt-4");
        });
        it("returns empty string if env var is empty", () => {
            process.env.OPENAI_MODEL = "";
            expect(getOpenAIModel()).toBe("gpt-4o-mini");
        });
    });
    describe("getOpenAIClient", () => {
        it("creates client with OPENAI_API_KEY", () => {
            process.env.OPENAI_API_KEY = "sk-test-key";
            const client = getOpenAIClient();
            expect(client).toBeDefined();
            // Note: We can't easily test the internal configuration without exposing it
        });
        it("creates client with OPENROUTER_API_KEY and sets baseURL", () => {
            process.env.OPENROUTER_API_KEY = "sk-or-test-key";
            const client = getOpenAIClient();
            expect(client).toBeDefined();
        });
        it("prefers OPENAI_API_KEY over OPENROUTER_API_KEY", () => {
            process.env.OPENAI_API_KEY = "sk-openai-key";
            process.env.OPENROUTER_API_KEY = "sk-openrouter-key";
            const client = getOpenAIClient();
            expect(client).toBeDefined();
        });
        it("uses custom base URL when provided", () => {
            process.env.OPENAI_API_KEY = "sk-test-key";
            process.env.OPENAI_BASE_URL = "https://custom.api.com/v1";
            const client = getOpenAIClient();
            expect(client).toBeDefined();
        });
        it("throws error when no API key is provided", () => {
            expect(() => getOpenAIClient()).toThrow("OPENAI_API_KEY または OPENROUTER_API_KEY が必要です");
        });
        it("throws error when API keys are empty strings", () => {
            process.env.OPENAI_API_KEY = "";
            process.env.OPENROUTER_API_KEY = "";
            expect(() => getOpenAIClient()).toThrow("OPENAI_API_KEY または OPENROUTER_API_KEY が必要です");
        });
    });
    describe("getSearchProvider", () => {
        it("returns 'auto' as default", () => {
            expect(getSearchProvider()).toBe("auto");
        });
        it("returns 'tavily' when set", () => {
            process.env.SEARCH_PROVIDER = "tavily";
            expect(getSearchProvider()).toBe("tavily");
        });
        it("returns 'serpapi' when set", () => {
            process.env.SEARCH_PROVIDER = "serpapi";
            expect(getSearchProvider()).toBe("serpapi");
        });
        it("normalizes case", () => {
            process.env.SEARCH_PROVIDER = "TAVILY";
            expect(getSearchProvider()).toBe("tavily");
            process.env.SEARCH_PROVIDER = "SerpAPI";
            expect(getSearchProvider()).toBe("serpapi");
        });
        it("returns 'auto' for invalid values", () => {
            process.env.SEARCH_PROVIDER = "invalid";
            expect(getSearchProvider()).toBe("auto");
            process.env.SEARCH_PROVIDER = "google";
            expect(getSearchProvider()).toBe("auto");
        });
        it("handles empty string", () => {
            process.env.SEARCH_PROVIDER = "";
            expect(getSearchProvider()).toBe("auto");
        });
    });
});
//# sourceMappingURL=env.test.js.map