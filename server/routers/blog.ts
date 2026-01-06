import { z } from "zod";
import { generateBlogIdeaReport } from "../../lib/blog-service";
import { publicProcedure, router } from "../trpc";

const generateInputSchema = z.object({
  notionPageId: z.string().optional(),
  notionDatabaseId: z.string().optional(),
  notionSearchQuery: z.string().optional(),
  slackChannelId: z.string().optional(),
  slackSearchQuery: z.string().optional(),
  theme: z.string().optional(),
  numIdeas: z.number().min(3).max(10).optional().default(5),
  language: z.enum(["ja", "en"]).optional().default("ja"),
});

export const blogRouter = router({
  generate: publicProcedure.input(generateInputSchema).mutation(async ({ input }) => {
    const result = await generateBlogIdeaReport({
      notionPageId: input.notionPageId,
      notionDatabaseId: input.notionDatabaseId,
      notionSearchQuery: input.notionSearchQuery,
      slackChannelId: input.slackChannelId,
      slackSearchQuery: input.slackSearchQuery,
      theme: input.theme,
      numIdeas: input.numIdeas,
      language: input.language,
    });

    return {
      ideas: result.ideas,
      topics: result.topics,
      summary: result.summary,
      markdown: result.markdown,
      stats: {
        sourcesCount: result.sources.length,
        topicsCount: result.topics.length,
      },
    };
  }),
});
