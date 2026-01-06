import z from "zod";
import { getOpenAIClient, getOpenAIModel } from "./env";
import type { BlogIdea, BlogInputSource, Language } from "./types";
import { clampText } from "./utils";

const BlogIdeaSchema = z.object({
  title: z.string().min(5).max(100),
  summary: z.string().min(20).max(500),
  targetAudience: z.string().min(3),
  keyPoints: z.array(z.string()).min(2).max(5),
  estimatedReadTime: z.string(),
  tags: z.array(z.string()).min(1).max(8),
  outline: z.array(z.string()).optional().default([]),
});

const OutputSchema = z.object({ ideas: z.array(BlogIdeaSchema) });

function sanitizeJsonText(text: string): string {
  let t = text.trim();
  t = t
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return t.slice(start, end + 1);
  }
  return t;
}

function formatSources(sources: BlogInputSource[], maxChars = 8000): string {
  const parts: string[] = [];

  for (const source of sources) {
    const label =
      source.type === "notion"
        ? "[Notion]"
        : source.type === "slack"
          ? "[Slack]"
          : "[Theme]";
    parts.push(`${label}\n${clampText(source.content, 2000)}`);
  }

  return clampText(parts.join("\n\n---\n\n"), maxChars);
}

export async function generateBlogIdeas(opts: {
  sources: BlogInputSource[];
  theme?: string;
  language?: Language;
  num?: number;
}): Promise<BlogIdea[]> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const language = opts.language || "ja";
  const num = Math.max(3, Math.min(10, opts.num || 5));

  const formattedSources = formatSources(opts.sources);
  const themeContext = opts.theme ? `\n\n[Additional Theme/Focus]\n${opts.theme}` : "";

  async function requestOnce(expected: number, previous?: string): Promise<BlogIdea[]> {
    const sysJa = `あなたはテックブログの企画を立てる専門家です。与えられた情報から、読者に価値を提供できる実践的なテックブログのアイデアを日本語で提案します。常にJSONのみを返します。`;
    const sysEn = `You are a tech blog content strategist. Generate practical, valuable tech blog ideas from the given information. Always return JSON only.`;

    const instructionsJa = `以下の情報を踏まえて、テックブログのアイデアをちょうど${expected}件提案してください。

出力はJSONのみ、コードフェンスなし。スキーマ:
{
  "ideas": [{
    "title": string (魅力的で具体的なタイトル),
    "summary": string (記事の概要、100-200文字),
    "targetAudience": string (想定読者),
    "keyPoints": string[] (記事の主要ポイント、2-5個),
    "estimatedReadTime": string (想定読了時間、例: "5分"),
    "tags": string[] (関連タグ、1-8個),
    "outline": string[] (記事の構成案、オプション)
  }]
}

アイデアは以下の観点で多様性を持たせてください：
- 初心者向け入門記事
- 実践的なTips/ノウハウ記事
- 事例紹介・振り返り記事
- 技術深掘り記事
- トレンド解説記事`;

    const instructionsEn = `Based on the following information, propose exactly ${expected} tech blog ideas.

Output JSON only (no code-fence). Schema:
{
  "ideas": [{
    "title": string (engaging, specific title),
    "summary": string (article overview, 50-100 words),
    "targetAudience": string (target readers),
    "keyPoints": string[] (main points, 2-5 items),
    "estimatedReadTime": string (e.g., "5 min"),
    "tags": string[] (related tags, 1-8),
    "outline": string[] (article structure, optional)
  }]
}

Ideas should have diversity:
- Beginner tutorials
- Practical tips/how-to
- Case studies/retrospectives
- Deep dives
- Trend analysis`;

    const user = `${language === "ja" ? instructionsJa : instructionsEn}

[Input Sources]
${formattedSources}${themeContext}${previous ? `\n\nFix note: The previous output had an invalid count. Return exactly ${expected} items.` : ""}`;

    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: language === "ja" ? sysJa : sysEn },
        { role: "user", content: user },
      ],
      temperature: 1,
      response_format: { type: "json_object" } as { type: "json_object" },
    });

    const raw = resp.choices?.[0]?.message?.content || "";
    const jsonText = sanitizeJsonText(raw);
    try {
      const parsed = JSON.parse(jsonText);
      const data = OutputSchema.safeParse(parsed);
      if (data.success) {
        return data.data.ideas.map((idea) => ({
          title: idea.title,
          summary: idea.summary,
          targetAudience: idea.targetAudience,
          keyPoints: idea.keyPoints,
          estimatedReadTime: idea.estimatedReadTime,
          tags: idea.tags,
          outline: idea.outline.length > 0 ? idea.outline : undefined,
        }));
      }
    } catch {
      // fallthrough
    }
    return [];
  }

  // Try up to 2 attempts
  let ideas = await requestOnce(num);
  if (ideas.length !== num) {
    ideas = await requestOnce(num, "retry");
  }

  // If still not enough, top up
  if (ideas.length < num) {
    const missing = num - ideas.length;
    const extra = await requestOnce(missing);
    ideas = ideas.concat(extra).slice(0, num);
  }

  return ideas.slice(0, num);
}

export async function extractKeyTopics(
  sources: BlogInputSource[],
  language: Language = "ja"
): Promise<{ topics: string[]; summary: string }> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();

  const formattedSources = formatSources(sources, 6000);

  const promptJa = `以下の情報から、テックブログのネタになりそうな主要トピックを10個程度抽出し、全体の要約も提供してください。

${formattedSources}

出力形式:
まず1段落で全体の要約を書き、その後箇条書きでトピックを列挙してください。`;

  const promptEn = `From the following information, extract about 10 main topics that could become tech blog content, and provide an overall summary.

${formattedSources}

Format:
First write a paragraph summarizing the overall content, then list topics as bullet points.`;

  const resp = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          language === "ja"
            ? "あなたはテックブログのコンテンツ企画者です。"
            : "You are a tech blog content strategist.",
      },
      { role: "user", content: language === "ja" ? promptJa : promptEn },
    ],
    temperature: 0.7,
  });

  const content = resp.choices?.[0]?.message?.content || "";
  const lines = content.split("\n");
  const summary = lines[0] || "";
  const topics = Array.from(content.matchAll(/^[-*]\s*(.+)$/gm))
    .map((m) => (m[1] ? m[1].trim() : ""))
    .filter(Boolean)
    .slice(0, 15);

  return { topics, summary };
}
