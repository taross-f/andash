import { z } from "zod";
import { generateCFPProposals } from "../../lib/cfp-service";
import { publicProcedure, router } from "../trpc";

const generateInputSchema = z.object({
  conferenceUrl: z.string().url(),
  extraUrls: z.array(z.string().url()).optional().default([]),
  numProposals: z.number().min(5).max(10).optional().default(8),
  language: z.enum(["ja", "en"]).optional().default("ja"),
  maxPages: z.number().min(1).max(50).optional().default(10),
});

export const cfpRouter = router({
  generate: publicProcedure.input(generateInputSchema).mutation(async ({ input }) => {
    const result = await generateCFPProposals({
      conferenceUrl: input.conferenceUrl,
      extraUrls: input.extraUrls,
      numProposals: input.numProposals,
      language: input.language,
      maxPages: input.maxPages,
    });

    return {
      conference: result.conference,
      proposals: result.proposals,
      markdown: result.markdown,
      stats: {
        pagesCrawled: result.crawled.length,
        scheduleSources: result.scheduleResults.length,
        trendSources: result.trendResults.length,
      },
    };
  }),
});
