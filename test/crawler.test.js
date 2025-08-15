import { beforeEach, describe, expect, it, mock } from "bun:test";
import { crawlPages } from "../src/crawler.js";
// Mock axios
const mockAxios = {
    get: mock(() => Promise.resolve({ data: "" })),
};
// Mock the axios module
mock.module("axios", () => ({
    default: mockAxios,
}));
describe("crawler", () => {
    beforeEach(() => {
        mockAxios.get.mockClear();
    });
    describe("crawlPages", () => {
        it("crawls a single page and extracts content", async () => {
            const mockHtml = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <h1>Main Heading</h1>
            <h2>Sub Heading</h2>
            <p>This is a paragraph.</p>
            <p>Another paragraph with content.</p>
            <a href="/page1">Link 1</a>
            <a href="/page2">Link 2</a>
          </body>
        </html>
      `;
            mockAxios.get.mockResolvedValueOnce({ data: mockHtml });
            const results = await crawlPages(["https://example.com"], { maxPages: 1 });
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                url: "https://example.com/",
                title: "Test Page",
                text: "Main Heading\nSub Heading\nThis is a paragraph.\nAnother paragraph with content.",
                headings: ["Main Heading", "Sub Heading"],
                links: ["https://example.com/page1", "https://example.com/page2"],
            });
        });
        it("handles pages without title", async () => {
            const mockHtml = `
        <html>
          <body>
            <p>Content without title</p>
          </body>
        </html>
      `;
            mockAxios.get.mockResolvedValueOnce({ data: mockHtml });
            const results = await crawlPages(["https://example.com"], { maxPages: 1 });
            expect(results[0]?.title).toBe("https://example.com/");
        });
        it("extracts text from various elements", async () => {
            const mockHtml = `
        <html>
          <body>
            <h1>Heading 1</h1>
            <h2>Heading 2</h2>
            <h3>Heading 3</h3>
            <p>Paragraph text</p>
            <ul>
              <li>List item 1</li>
              <li>List item 2</li>
            </ul>
            <div>Ignored div content</div>
          </body>
        </html>
      `;
            mockAxios.get.mockResolvedValueOnce({ data: mockHtml });
            const results = await crawlPages(["https://example.com"], { maxPages: 1 });
            expect(results[0]?.text).toBe("Heading 1\nHeading 2\nHeading 3\nParagraph text\nList item 1\nList item 2");
            expect(results[0]?.headings).toEqual(["Heading 1", "Heading 2", "Heading 3"]);
        });
        it("normalizes whitespace in text", async () => {
            const mockHtml = `
        <html>
          <body>
            <p>Text   with    multiple    spaces</p>
            <p>Text
              with
              newlines</p>
          </body>
        </html>
      `;
            mockAxios.get.mockResolvedValueOnce({ data: mockHtml });
            const results = await crawlPages(["https://example.com"], { maxPages: 1 });
            expect(results[0]?.text).toBe("Text with multiple spaces\nText with newlines");
        });
        it("resolves relative URLs to absolute", async () => {
            const mockHtml = `
        <html>
          <body>
            <a href="/relative">Relative Link</a>
            <a href="relative-no-slash">Another Relative</a>
            <a href="https://external.com">External Link</a>
            <a href="#hash">Hash Link</a>
            <a href="mailto:test@example.com">Email Link</a>
          </body>
        </html>
      `;
            mockAxios.get.mockResolvedValueOnce({ data: mockHtml });
            const results = await crawlPages(["https://example.com/path"], { maxPages: 1 });
            expect(results[0]?.links).toEqual([
                "https://example.com/relative",
                "https://example.com/relative-no-slash",
                "https://external.com/",
                "https://example.com/path",
                "mailto:test@example.com",
            ]);
        });
        it("follows links up to maxPages limit", async () => {
            const page1Html = `
        <html>
          <head><title>Page 1</title></head>
          <body>
            <p>First page content</p>
            <a href="/page2">Link to Page 2</a>
          </body>
        </html>
      `;
            const page2Html = `
        <html>
          <head><title>Page 2</title></head>
          <body>
            <p>Second page content</p>
            <a href="/page3">Link to Page 3</a>
          </body>
        </html>
      `;
            mockAxios.get
                .mockResolvedValueOnce({ data: page1Html })
                .mockResolvedValueOnce({ data: page2Html });
            const results = await crawlPages(["https://example.com"], { maxPages: 2 });
            expect(results).toHaveLength(2);
            expect(results[0]?.title).toBe("Page 1");
            expect(results[1]?.title).toBe("Page 2");
            expect(mockAxios.get).toHaveBeenCalledTimes(2);
        });
        it("respects sameHostOnly option", async () => {
            const mockHtml = `
        <html>
          <body>
            <a href="/same-host">Same Host</a>
            <a href="https://external.com/different">Different Host</a>
          </body>
        </html>
      `;
            mockAxios.get.mockResolvedValueOnce({ data: mockHtml });
            const results = await crawlPages(["https://example.com"], {
                maxPages: 5,
                sameHostOnly: true,
            });
            // Should only make one request (original page) because external link is filtered
            expect(mockAxios.get).toHaveBeenCalledTimes(1);
            expect(results).toHaveLength(1);
        });
        it("allows cross-host crawling when sameHostOnly is false", async () => {
            const page1Html = `
        <html>
          <body>
            <p>Page 1</p>
            <a href="https://external.com/page">External Link</a>
          </body>
        </html>
      `;
            const page2Html = `
        <html>
          <body>
            <p>External page</p>
          </body>
        </html>
      `;
            mockAxios.get
                .mockResolvedValueOnce({ data: page1Html })
                .mockResolvedValueOnce({ data: page2Html });
            const results = await crawlPages(["https://example.com"], {
                maxPages: 2,
                sameHostOnly: false,
            });
            expect(mockAxios.get).toHaveBeenCalledTimes(2);
            expect(mockAxios.get).toHaveBeenCalledWith("https://example.com", expect.any(Object));
            expect(mockAxios.get).toHaveBeenCalledWith("https://external.com/page", expect.any(Object));
        });
        it("handles HTTP request failures gracefully", async () => {
            const page1Html = `
        <html>
          <body>
            <p>Working page</p>
            <a href="/broken">Broken Link</a>
          </body>
        </html>
      `;
            mockAxios.get
                .mockResolvedValueOnce({ data: page1Html })
                .mockRejectedValueOnce(new Error("Network error"));
            const results = await crawlPages(["https://example.com"], { maxPages: 2 });
            expect(results).toHaveLength(1);
            expect(results[0]?.text).toBe("Working page");
        });
        it("deduplicates URLs", async () => {
            const mockHtml = `
        <html>
          <body>
            <a href="/page1">Link 1</a>
            <a href="/page1">Same Link Again</a>
            <a href="/page1/">Same Link with Slash</a>
            <a href="/page2">Different Link</a>
          </body>
        </html>
      `;
            mockAxios.get.mockResolvedValue({ data: "<html><body></body></html>" });
            await crawlPages(["https://example.com"], { maxPages: 10 });
            // Should call get for: original page, /page1 (once), /page2
            expect(mockAxios.get).toHaveBeenCalledTimes(3);
        });
        it("uses correct HTTP headers", async () => {
            mockAxios.get.mockResolvedValueOnce({ data: "<html></html>" });
            await crawlPages(["https://example.com"], { maxPages: 1, timeoutMs: 5000 });
            expect(mockAxios.get).toHaveBeenCalledWith("https://example.com", {
                timeout: 5000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    Accept: "text/html,application/xhtml+xml",
                },
                maxRedirects: 3,
            });
        });
        it("normalizes start URLs", async () => {
            mockAxios.get.mockResolvedValue({ data: "<html></html>" });
            await crawlPages([
                "https://example.com/",
                "https://example.com", // Same after normalization
                "https://example.com/page/",
            ], { maxPages: 10 });
            // Should deduplicate normalized URLs
            const calledUrls = mockAxios.get.mock.calls.map((call) => call[0]);
            const uniqueUrls = [...new Set(calledUrls)];
            expect(uniqueUrls).toEqual(["https://example.com/", "https://example.com/page"]);
        });
        it("handles empty start URLs array", async () => {
            const results = await crawlPages([], { maxPages: 5 });
            expect(results).toEqual([]);
            expect(mockAxios.get).not.toHaveBeenCalled();
        });
        it("handles links without href attribute", async () => {
            const mockHtml = `
        <html>
          <body>
            <a>Link without href</a>
            <a href="">Empty href</a>
            <a href="/valid">Valid link</a>
          </body>
        </html>
      `;
            mockAxios.get.mockResolvedValueOnce({ data: mockHtml });
            const results = await crawlPages(["https://example.com"], { maxPages: 1 });
            expect(results[0]?.links).toEqual(["https://example.com/valid"]);
        });
        it("uses default options when not provided", async () => {
            mockAxios.get.mockResolvedValue({ data: "<html></html>" });
            await crawlPages(["https://example.com"]);
            expect(mockAxios.get).toHaveBeenCalledWith("https://example.com", expect.objectContaining({
                timeout: 15000, // default timeout
            }));
        });
    });
});
//# sourceMappingURL=crawler.test.js.map