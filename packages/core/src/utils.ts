import { URL } from "node:url";

export function normalizeUrl(inputUrl: string): string {
  try {
    const url = new URL(inputUrl);
    url.hash = "";
    if (url.pathname.endsWith("/") && url.pathname.length > 1) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return inputUrl.trim();
  }
}

export function getHost(inputUrl: string): string | null {
  try {
    return new URL(inputUrl).host;
  } catch {
    return null;
  }
}

export function isSameHost(a: string, b: string): boolean {
  const ha = getHost(a);
  const hb = getHost(b);
  return !!ha && !!hb && ha === hb;
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clampText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n[...truncated...]`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\-_.]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-/g, "")
    .replace(/-$/g, "");
}
