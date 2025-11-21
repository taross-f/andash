import { afterAll, beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { CFPGenerationInput, CFPGenerationProgress } from "../lib/cfp-service";
import { generateCFPProposals } from "../lib/cfp-service";
import * as crawler from "../src/crawler.js";
import * as llm from "../src/llm.js";
import * as report from "../src/report.js";
import * as search from "../src/search.js";

describe("CFP Service", () => {
  // Create spies
  const mockCrawlPages = spyOn(crawler, "crawlPages");
  const mockExtractThemeAndKeywords = spyOn(llm, "extractThemeAndKeywords");
  const mockGenerateProposals = spyOn(llm, "generateProposals");
  const mockSearchWeb = spyOn(search, "searchWeb");
  const mockBuildScheduleQueries = spyOn(search, "buildScheduleQueries");
  const mockGenerateReportMarkdown = spyOn(report, "generateReportMarkdown");

  afterAll(() => {
    mockCrawlPages.mockRestore();
    mockExtractThemeAndKeywords.mockRestore();
    mockGenerateProposals.mockRestore();
    mockSearchWeb.mockRestore();
    mockBuildScheduleQueries.mockRestore();
    mockGenerateReportMarkdown.mockRestore();
  });

  beforeEach(() => {
    // Reset and configure mocks
    mockCrawlPages.mockReset().mockImplementation(() =>
      Promise.resolve([
        {
          url: "https://example.com",
          title: "Test Conference 2025",
          text: "A conference about technology",
          headings: ["Welcome", "Schedule"],
          links: [],
        },
      ])
    );

    mockExtractThemeAndKeywords.mockReset().mockImplementation(() =>
      Promise.resolve({
        themeSummary: "Technology innovation",
        keywords: ["AI", "cloud", "devops"],
      })
    );

    mockGenerateProposals.mockReset().mockImplementation(() =>
      Promise.resolve([
        {
          title: "AI Best Practices",
          abstract: "Learn about AI implementation strategies",
          targetAudience: "Developers",
          difficulty: "Intermediate" as const,
        },
      ])
    );

    mockSearchWeb.mockReset().mockImplementation(() =>
      Promise.resolve([
        {
          title: "Past Schedule",
          url: "https://example.com/past",
          source: "tavily" as const,
        },
      ])
    );

    mockBuildScheduleQueries.mockReset().mockImplementation(() => ["test conference schedule"]);

    mockGenerateReportMarkdown.mockReset().mockImplementation(() => "# Report\nTest markdown");
  });

  describe("generateCFPProposals", () => {
    it("should generate proposals for a conference URL", async () => {
      const input: CFPGenerationInput = {
        conferenceUrl: "https://example.com",
      };

      const result = await generateCFPProposals(input);

      expect(result.conference.url).toBe("https://example.com");
      expect(result.conference.title).toBe("Test Conference 2025");
      expect(result.conference.themeSummary).toBe("Technology innovation");
      expect(result.conference.keywords).toEqual(["AI", "cloud", "devops"]);
      expect(result.proposals).toHaveLength(1);
      expect(result.proposals[0]?.title).toBe("AI Best Practices");
      expect(result.markdown).toBe("# Report\nTest markdown");
    });

    it("should use default values when not provided", async () => {
      await generateCFPProposals({ conferenceUrl: "https://example.com" });

      expect(mockCrawlPages).toHaveBeenCalledWith(["https://example.com"], {
        maxPages: 10,
        sameHostOnly: true,
        timeoutMs: 15000,
      });
    });

    it("should clamp numProposals to valid range", async () => {
      await generateCFPProposals({
        conferenceUrl: "https://example.com",
        numProposals: 15,
      });

      const lastCall = mockGenerateProposals.mock.calls[0];
      expect(lastCall?.[0]?.num).toBe(10);
    });

    it("should include extra URLs in crawling", async () => {
      await generateCFPProposals({
        conferenceUrl: "https://example.com",
        extraUrls: ["https://extra1.com", "https://extra2.com"],
      });

      expect(mockCrawlPages).toHaveBeenCalledWith(
        ["https://example.com", "https://extra1.com", "https://extra2.com"],
        expect.any(Object)
      );
    });

    it("should call progress callback at each stage", async () => {
      const progressStages: CFPGenerationProgress[] = [];
      const onProgress = (p: CFPGenerationProgress) => progressStages.push(p);

      await generateCFPProposals({ conferenceUrl: "https://example.com" }, onProgress);

      expect(progressStages).toHaveLength(5);
      expect(progressStages[0]?.stage).toBe("crawling");
      expect(progressStages[1]?.stage).toBe("analyzing");
      expect(progressStages[2]?.stage).toBe("searching");
      expect(progressStages[3]?.stage).toBe("generating");
      expect(progressStages[4]?.stage).toBe("complete");
    });

    it("should build trend query in Japanese", async () => {
      await generateCFPProposals({
        conferenceUrl: "https://example.com",
        language: "ja",
      });

      const searchCalls = mockSearchWeb.mock.calls;
      const trendCall = searchCalls.find((call) => String(call[0]).includes("最新"));
      expect(trendCall).toBeDefined();
    });

    it("should build trend query in English", async () => {
      await generateCFPProposals({
        conferenceUrl: "https://example.com",
        language: "en",
      });

      const searchCalls = mockSearchWeb.mock.calls;
      const trendCall = searchCalls.find((call) => String(call[0]).includes("latest trends"));
      expect(trendCall).toBeDefined();
    });
  });
});
