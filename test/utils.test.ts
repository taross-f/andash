import { describe, expect, it } from "bun:test";
import {
  clampText,
  getHost,
  isSameHost,
  normalizeUrl,
  sleep,
  slugify,
  unique,
} from "../src/utils.js";

describe("utils", () => {
  describe("normalizeUrl", () => {
    it("removes trailing slash from non-root pathname", () => {
      expect(normalizeUrl("https://example.com/path/")).toBe("https://example.com/path");
    });

    it("preserves root slash", () => {
      expect(normalizeUrl("https://example.com")).toBe("https://example.com/");
      expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
    });

    it("removes hash fragment", () => {
      expect(normalizeUrl("https://example.com/path#section")).toBe("https://example.com/path");
    });

    it("handles URLs without trailing slash", () => {
      expect(normalizeUrl("https://example.com/path")).toBe("https://example.com/path");
    });

    it("preserves query parameters", () => {
      expect(normalizeUrl("https://example.com/path?param=value")).toBe(
        "https://example.com/path?param=value"
      );
    });

    it("returns trimmed input for invalid URLs", () => {
      expect(normalizeUrl("  not-a-url  ")).toBe("not-a-url");
    });

    it("handles empty string", () => {
      expect(normalizeUrl("")).toBe("");
    });
  });

  describe("getHost", () => {
    it("extracts host from valid URL", () => {
      expect(getHost("https://example.com/path")).toBe("example.com");
    });

    it("extracts host with port", () => {
      expect(getHost("https://example.com:8080/path")).toBe("example.com:8080");
    });

    it("extracts host from different protocols", () => {
      expect(getHost("http://example.com")).toBe("example.com");
      expect(getHost("ftp://example.com")).toBe("example.com");
    });

    it("returns null for invalid URLs", () => {
      expect(getHost("not-a-url")).toBeNull();
      expect(getHost("")).toBeNull();
    });
  });

  describe("isSameHost", () => {
    it("returns true for same hosts", () => {
      expect(isSameHost("https://example.com/path1", "https://example.com/path2")).toBe(true);
    });

    it("returns false for different hosts", () => {
      expect(isSameHost("https://example.com/path", "https://different.com/path")).toBe(false);
    });

    it("considers ports in host comparison", () => {
      expect(isSameHost("https://example.com:8080/path", "https://example.com/path")).toBe(false);
    });

    it("returns false when either URL is invalid", () => {
      expect(isSameHost("invalid-url", "https://example.com")).toBe(false);
      expect(isSameHost("https://example.com", "invalid-url")).toBe(false);
      expect(isSameHost("invalid-url", "another-invalid")).toBe(false);
    });
  });

  describe("unique", () => {
    it("removes duplicate strings", () => {
      expect(unique(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
    });

    it("removes duplicate numbers", () => {
      expect(unique([1, 2, 1, 3, 2])).toEqual([1, 2, 3]);
    });

    it("handles empty array", () => {
      expect(unique([])).toEqual([]);
    });

    it("handles array with no duplicates", () => {
      expect(unique(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    });

    it("handles array with all same elements", () => {
      expect(unique(["a", "a", "a"])).toEqual(["a"]);
    });
  });

  describe("sleep", () => {
    it("resolves after specified time", async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      // Allow some tolerance for timing
      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(elapsed).toBeLessThan(100);
    });

    it("resolves immediately for 0ms", async () => {
      const start = Date.now();
      await sleep(0);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(10);
    });
  });

  describe("clampText", () => {
    it("returns original text if within limit", () => {
      const text = "short text";
      expect(clampText(text, 20)).toBe(text);
    });

    it("truncates text and adds indicator when over limit", () => {
      const text = "this is a very long text that should be truncated";
      const result = clampText(text, 20);
      expect(result).toBe("this is a very long \n[...truncated...]");
      expect(result.length).toBe(20 + "\n[...truncated...]".length);
    });

    it("handles exact limit", () => {
      const text = "exactly20characters!";
      expect(clampText(text, 20)).toBe(text);
    });

    it("handles empty string", () => {
      expect(clampText("", 10)).toBe("");
    });

    it("handles zero limit", () => {
      expect(clampText("text", 0)).toBe("\n[...truncated...]");
    });
  });

  describe("slugify", () => {
    it("converts to lowercase", () => {
      expect(slugify("UPPERCASE TEXT")).toBe("uppercase-text");
    });

    it("replaces spaces with hyphens", () => {
      expect(slugify("hello world")).toBe("hello-world");
    });

    it("removes special characters", () => {
      expect(slugify("hello@world!")).toBe("hello-world");
    });

    it("collapses multiple hyphens", () => {
      expect(slugify("hello   world")).toBe("hello-world");
    });

    it("removes leading and trailing hyphens", () => {
      expect(slugify("!hello world!")).toBe("hello-world");
    });

    it("preserves allowed characters", () => {
      expect(slugify("hello-world_2024.v1")).toBe("hello-world_2024.v1");
    });

    it("handles empty string", () => {
      expect(slugify("")).toBe("");
    });

    it("handles only special characters", () => {
      expect(slugify("!@#$%")).toBe("");
    });

    it("handles mixed content", () => {
      expect(slugify("Go Conference 2024 - CFP Helper!")).toBe("go-conference-2024-cfp-helper");
    });
  });
});
