import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { jobs } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const jobRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        conferenceUrl: z.string().url(),
        pastUrls: z.array(z.string().url()).optional(),
        numProposals: z.number().min(5).max(10),
        language: z.enum(["ja", "en"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [job] = await ctx.db
        .insert(jobs)
        .values({
          conferenceUrl: input.conferenceUrl,
          pastUrls: input.pastUrls?.join(",") ?? null,
          numProposals: input.numProposals,
          language: input.language,
          status: "pending",
        })
        .returning();

      // TODO: Queue the job for processing
      // await ctx.queue.send({ jobId: job.id });

      return job;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.query.jobs.findFirst({
        where: eq(jobs.id, input.id),
      });
      return job;
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.jobs.findMany({
      orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
      limit: 50,
    });
  }),
});
