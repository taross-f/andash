import z from "zod";
import { getOpenAIClient, getOpenAIModel } from "./env.js";
import type { CFPProposal, CrawledPage } from "./types.js";
import { clampText } from "./utils.js";

export async function extractThemeAndKeywords(
  pages: CrawledPage[],
  language: "ja" | "en" = "ja"
): Promise<{ themeSummary: string; keywords: string[] }> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const sampleText = clampText(
    (pages || [])
      .slice(0, 5)
      .map((p) => `# ${p.title}\n${clampText(p.text, 2000)}`)
      .join("\n\n"),
    8000
  );

  const prompt =
    language === "ja"
      ? `次のカンファレンス情報から、(1)主要テーマの要約(200-300字) と (2)関連キーワード10個程度（日本語・英語混在してOK）を箇条書きで抽出してください。\n\n${sampleText}`
      : `From the following conference information, extract (1) a 2-3 sentence theme summary and (2) ~10 related keywords (bulleted).\n\n${sampleText}`;

  const resp = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You are a concise conference analyst." },
      { role: "user", content: prompt },
    ],
    temperature: 1,
  });

  const content = resp.choices?.[0]?.message?.content || "";
  const themeSummary = (content.split("\n")[0] || content.slice(0, 400)) ?? "";
  const keywords = Array.from(content.matchAll(/^[\-\*]\s*(.+)$/gm))
    .map((m) => (m[1] ? m[1].trim() : ""))
    .filter(Boolean)
    .slice(0, 20);
  return { themeSummary, keywords };
}

export async function generateProposals(opts: {
  conferenceTitle: string;
  conferenceUrl: string;
  themeSummary: string;
  keywords: string[];
  scheduleBrief?: string;
  trendBrief?: string;
  language?: "ja" | "en";
  num?: number;
}): Promise<CFPProposal[]> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const language = opts.language || "ja";
  const num = Math.max(5, Math.min(10, opts.num || 8));

  const ProposalSchema = z.object({
    title: z.string().min(8).max(160),
    abstract: z.string().min(40).max(1200),
    targetAudience: z.string().min(3),
    difficulty: z.enum(["Beginner", "Intermediate", "Advanced", "All"]),
    rationale: z.string().optional().nullable(),
    references: z.array(z.string().url()).max(5).optional().default([]),
  });
  const OutputSchema = z.object({ items: z.array(ProposalSchema) });

  function sanitizeJsonText(text: string): string {
    let t = text.trim();
    t = t
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    // Try to extract the first JSON object
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return t.slice(start, end + 1);
    }
    return t;
  }

  async function requestOnce(expected: number, previous?: string): Promise<CFPProposal[]> {
    const sys =
      language === "ja"
        ? "あなたはトップカンファレンスのCFPを設計する専門家です。実行可能で具体的、審査で通りやすい提案を日本語で出します。常にJSONのみを返します。"
        : "You are an expert CFP designer for top conferences. Generate feasible, concrete, high-approval proposals. Always return JSON only.";

    const instructionsJa = `次の情報を踏まえて、CFP候補をちょうど${expected}件作成してください。出力はJSONのみ、コードフェンスなし。スキーマ: {"items": [{"title": string, "abstract": string, "targetAudience": string, "difficulty": "Beginner"|"Intermediate"|"Advanced"|"All", "rationale"?: string, "references"?: string[] }]}. 各タイトルは40〜70文字、概要は200〜400文字、referencesは最大3件の有効なURL。`;
    const instructionsEn = `Propose exactly ${expected} CFP ideas. Output JSON only (no code-fence). Schema: {"items": [{"title": string, "abstract": string, "targetAudience": string, "difficulty": "Beginner"|"Intermediate"|"Advanced"|"All", "rationale"?: string, "references"?: string[] }]}. Titles concise (40-70 chars), abstracts 4-6 sentences, up to 3 valid URLs.`;

    const user = `${language === "ja" ? instructionsJa : instructionsEn}\n\n[Conference]\n- Title: ${opts.conferenceTitle}\n- URL: ${
      opts.conferenceUrl
    }\n- Theme summary: ${opts.themeSummary}\n- Keywords: ${opts.keywords.join(
      ", "
    )}\n\n[Past schedule highlights]\n${
      opts.scheduleBrief || (language === "ja" ? "(情報少)" : "(limited)")
    }\n\n[Latest trends]\n${opts.trendBrief || (language === "ja" ? "(情報少)" : "(limited)")}${
      previous
        ? `\n\nFix note: The previous output had an invalid count. Return exactly ${expected} items.`
        : ""
    }`;

    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: sys },
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
        // Normalize optional fields
        const normalized = data.data.items.map((it) => ({
          title: it.title,
          abstract: it.abstract,
          targetAudience: it.targetAudience,
          difficulty: it.difficulty,
          rationale: (it.rationale ?? undefined) as string | undefined,
          references: (it.references ?? []).slice(0, 3),
        }));
        return normalized;
      }
    } catch {
      // fallthrough
    }
    return [];
  }

  // Try up to 2 attempts to get exactly num items
  let proposals = await requestOnce(num);
  if (proposals.length !== num) {
    proposals = await requestOnce(num, "retry");
  }

  // If still not enough, try to top up with a small follow-up request for the missing count
  if (proposals.length < num) {
    const missing = num - proposals.length;
    const extra = await requestOnce(missing);
    proposals = proposals.concat(extra).slice(0, num);
  }

  // As a last resort, fill remaining with simple synthesized items from keywords
  if (proposals.length < num) {
    const baseKeywords = opts.keywords.slice(0, 8);
    while (proposals.length < num) {
      const idx = proposals.length + 1;
      const k = baseKeywords[idx % Math.max(1, baseKeywords.length)] || "Trends";
      proposals.push({
        title: `${opts.conferenceTitle}: ${k} 実践と最新動向`,
        abstract: `${opts.conferenceTitle} のテーマに沿って、${k} に関する最新事例と実装上の注意点、運用のベストプラクティスを整理します。参加者は実務に直結する知見を持ち帰ることができます。`,
        targetAudience: "実務エンジニア / テックリード",
        difficulty: "All",
        references: [],
      });
    }
  }

  return proposals.slice(0, num);
}
