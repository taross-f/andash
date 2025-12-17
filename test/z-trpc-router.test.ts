import { afterAll, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as cfpService from "../lib/cfp-service";
import { appRouter } from "../server/root";

// Spy on the actual service
const mockGenerateCFPProposals = spyOn(cfpService, "generateCFPProposals").mockImplementation(() =>
  Promise.resolve({
    conference: {
      url: "https://example.com",
      title: "Test Conference",
      themeSummary: "Tech innovation",
      keywords: ["AI", "cloud"],
    },
    crawled: [
      {
        url: "https://example.com",
        title: "Test Conference",
        text: "Content",
        headings: [],
        links: [],
      },
    ],
    scheduleResults: [
      { title: "Past Schedule", url: "https://example.com/past", source: "tavily" as const },
    ],
    trendResults: [
      { title: "AI Trends", url: "https://example.com/trends", source: "tavily" as const },
    ],
    proposals: [
      {
        title: "AI Proposal",
        abstract: "Learn about AI",
        targetAudience: "Developers",
        difficulty: "Intermediate" as const,
      },
    ],
    markdown: "# Report",
  })
);

describe("tRPC Router", () => {
  const caller = appRouter.createCaller({});

  afterAll(() => {
    mockGenerateCFPProposals.mockRestore();
  });

  beforeEach(() => {
    mockGenerateCFPProposals.mockClear();
  });

  describe("health endpoint", () => {
    it("should return ok status", async () => {
      const result = await caller.health();
      expect(result).toEqual({ status: "ok" });
    });
  });

  describe("cfp.generate endpoint", () => {
    it("should generate proposals with minimal input", async () => {
      const result = await caller.cfp.generate({
        conferenceUrl: "https://example.com",
      });

      expect(result.conference.url).toBe("https://example.com");
      expect(result.conference.title).toBe("Test Conference");
      expect(result.proposals).toHaveLength(1);
      expect(result.markdown).toBe("# Report");
      expect(result.stats.pagesCrawled).toBe(1);
      expect(result.stats.scheduleSources).toBe(1);
      expect(result.stats.trendSources).toBe(1);
    });

    it("should pass all options to service", async () => {
      await caller.cfp.generate({
        conferenceUrl: "https://example.com",
        extraUrls: ["https://extra.com"],
        numProposals: 6,
        language: "en",
        maxPages: 20,
      });

      expect(mockGenerateCFPProposals).toHaveBeenCalledWith({
        conferenceUrl: "https://example.com",
        extraUrls: ["https://extra.com"],
        numProposals: 6,
        language: "en",
        maxPages: 20,
      });
    });

    it("should reject invalid URL", async () => {
      await expect(
        caller.cfp.generate({
          conferenceUrl: "not-a-url",
        })
      ).rejects.toThrow();
    });

    it("should reject numProposals out of range", async () => {
      await expect(
        caller.cfp.generate({
          conferenceUrl: "https://example.com",
          numProposals: 3,
        })
      ).rejects.toThrow();
    });

    it("should reject invalid language", async () => {
      await expect(
        caller.cfp.generate({
          conferenceUrl: "https://example.com",
          // @ts-expect-error Testing invalid input
          language: "fr",
        })
      ).rejects.toThrow();
    });
  });
});
