import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { buildScheduleQueries, searchWeb } from "../src/search.js";

// Mock axios
const mockAxios = {
  post: mock(() => Promise.resolve({ data: {} })),
  get: mock(() => Promise.resolve({ data: {} })),
};

// Mock the axios module
mock.module("axios", () => ({
  default: mockAxios,
}));

describe("search", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear API keys
    process.env.TAVILY_API_KEY = undefined;
    process.env.SERPAPI_API_KEY = undefined;

    // Reset mocks
    mockAxios.post.mockClear();
    mockAxios.get.mockClear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("buildScheduleQueries", () => {
    it("builds queries with site parameter for valid URL", () => {
      const queries = buildScheduleQueries("https://example.com/conference");
      expect(queries).toEqual([
        "site:example.com schedule",
        "site:example.com agenda",
        "site:example.com program",
        "site:example.com speakers",
        "site:example.com timetable",
      ]);
    });

    it("builds queries without site parameter for invalid URL", () => {
      const queries = buildScheduleQueries("not-a-url");
      expect(queries).toEqual(
        [" schedule", " agenda", " program", " speakers", " timetable"].filter(Boolean)
      );
    });

    it("handles URL with path", () => {
      const queries = buildScheduleQueries("https://example.com/events/2024");
      expect(queries).toEqual([
        "site:example.com schedule",
        "site:example.com agenda",
        "site:example.com program",
        "site:example.com speakers",
        "site:example.com timetable",
      ]);
    });

    it("handles URL with port", () => {
      const queries = buildScheduleQueries("https://example.com:8080/conference");
      expect(queries).toEqual([
        "site:example.com:8080 schedule",
        "site:example.com:8080 agenda",
        "site:example.com:8080 program",
        "site:example.com:8080 speakers",
        "site:example.com:8080 timetable",
      ]);
    });
  });

  describe("searchWeb", () => {
    describe("provider selection", () => {
      it("uses tavily when explicitly specified and key exists", async () => {
        process.env.TAVILY_API_KEY = "test-tavily-key";
        mockAxios.post.mockResolvedValueOnce({
          data: { results: [] },
        });

        await searchWeb("test query", "tavily");

        expect(mockAxios.post).toHaveBeenCalledWith(
          "https://api.tavily.com/search",
          {
            api_key: "test-tavily-key",
            query: "test query",
            max_results: 8,
            search_depth: "advanced",
          },
          { timeout: 15000 }
        );
      });

      it("uses serpapi when explicitly specified and key exists", async () => {
        process.env.SERPAPI_API_KEY = "test-serp-key";
        mockAxios.get.mockResolvedValueOnce({
          data: { organic_results: [] },
        });

        await searchWeb("test query", "serpapi");

        expect(mockAxios.get).toHaveBeenCalledWith("https://serpapi.com/search.json", {
          params: {
            engine: "google",
            q: "test query",
            api_key: "test-serp-key",
            num: 8,
          },
          timeout: 15000,
        });
      });

      it("prefers tavily in auto mode when both keys exist", async () => {
        process.env.TAVILY_API_KEY = "test-tavily-key";
        process.env.SERPAPI_API_KEY = "test-serp-key";
        mockAxios.post.mockResolvedValueOnce({
          data: { results: [] },
        });

        await searchWeb("test query", "auto");

        expect(mockAxios.post).toHaveBeenCalled();
        expect(mockAxios.get).not.toHaveBeenCalled();
      });

      it("falls back to serpapi in auto mode when only serp key exists", async () => {
        process.env.SERPAPI_API_KEY = "test-serp-key";
        mockAxios.get.mockResolvedValueOnce({
          data: { organic_results: [] },
        });

        await searchWeb("test query", "auto");

        expect(mockAxios.get).toHaveBeenCalled();
        expect(mockAxios.post).not.toHaveBeenCalled();
      });

      it("falls back to naive search when no keys are available", async () => {
        mockAxios.get.mockResolvedValueOnce({
          data: '<a rel="nofollow" class="result__a" href="https://example.com">Example Title</a>',
        });

        const _results = await searchWeb("test query", "auto");

        expect(mockAxios.get).toHaveBeenCalledWith("https://duckduckgo.com/html/", {
          params: { q: "test query" },
          timeout: 15000,
        });
      });
    });

    describe("tavily response parsing", () => {
      beforeEach(() => {
        process.env.TAVILY_API_KEY = "test-key";
      });

      it("parses tavily response correctly", async () => {
        const mockResponse = {
          data: {
            results: [
              {
                title: "Test Title",
                url: "https://example.com",
                content: "Test content description",
              },
              {
                title: "Another Title",
                url: "https://example2.com",
                content: "Another description",
              },
            ],
          },
        };
        mockAxios.post.mockResolvedValueOnce(mockResponse);

        const results = await searchWeb("test query");

        expect(results).toEqual([
          {
            title: "Test Title",
            url: "https://example.com",
            snippet: "Test content description",
            source: "tavily",
          },
          {
            title: "Another Title",
            url: "https://example2.com",
            snippet: "Another description",
            source: "tavily",
          },
        ]);
      });

      it("handles missing fields in tavily response", async () => {
        const mockResponse = {
          data: {
            results: [{ url: "https://example.com" }, { title: "Title Only" }],
          },
        };
        mockAxios.post.mockResolvedValueOnce(mockResponse);

        const results = await searchWeb("test query");

        expect(results).toEqual([
          {
            title: "https://example.com",
            url: "https://example.com",
            snippet: undefined,
            source: "tavily",
          },
          {
            title: "Title Only",
            url: "",
            snippet: undefined,
            source: "tavily",
          },
        ]);
      });

      it("truncates long content in tavily response", async () => {
        const longContent = "a".repeat(500);
        const mockResponse = {
          data: {
            results: [
              {
                title: "Test",
                url: "https://example.com",
                content: longContent,
              },
            ],
          },
        };
        mockAxios.post.mockResolvedValueOnce(mockResponse);

        const results = await searchWeb("test query");

        expect(results[0]?.snippet).toBe(longContent.slice(0, 300));
      });
    });

    describe("serpapi response parsing", () => {
      beforeEach(() => {
        process.env.SERPAPI_API_KEY = "test-key";
      });

      it("parses serpapi response correctly", async () => {
        const mockResponse = {
          data: {
            organic_results: [
              {
                title: "SerpAPI Title",
                link: "https://example.com",
                snippet: "SerpAPI snippet",
              },
            ],
          },
        };
        mockAxios.get.mockResolvedValueOnce(mockResponse);

        const results = await searchWeb("test query", "serpapi");

        expect(results).toEqual([
          {
            title: "SerpAPI Title",
            url: "https://example.com",
            snippet: "SerpAPI snippet",
            source: "serpapi",
          },
        ]);
      });
    });

    describe("naive search parsing", () => {
      it("parses DuckDuckGo HTML response", async () => {
        const mockHtml = `
          <a rel="nofollow" class="result__a" href="https://example.com">Example Title</a>
          <a rel="nofollow" class="result__a" href="https://example2.com">Another <b>Title</b></a>
        `;
        mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

        const results = await searchWeb("test query");

        expect(results).toEqual([
          {
            title: "Example Title",
            url: "https://example.com",
            snippet: undefined,
            source: "naive",
          },
          {
            title: "Another Title",
            url: "https://example2.com",
            snippet: undefined,
            source: "naive",
          },
        ]);
      });

      it("returns empty array when naive search fails", async () => {
        mockAxios.get.mockRejectedValueOnce(new Error("Network error"));

        const results = await searchWeb("test query");

        expect(results).toEqual([]);
      });
    });

    describe("maxResults parameter", () => {
      it("respects maxResults parameter for tavily", async () => {
        process.env.TAVILY_API_KEY = "test-key";
        mockAxios.post.mockResolvedValueOnce({
          data: { results: [] },
        });

        await searchWeb("test query", "tavily", 5);

        expect(mockAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            max_results: 5,
          }),
          expect.any(Object)
        );
      });

      it("caps maxResults at 10 for external APIs", async () => {
        process.env.TAVILY_API_KEY = "test-key";
        mockAxios.post.mockResolvedValueOnce({
          data: { results: [] },
        });

        await searchWeb("test query", "tavily", 20);

        expect(mockAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            max_results: 10,
          }),
          expect.any(Object)
        );
      });
    });
  });
});
