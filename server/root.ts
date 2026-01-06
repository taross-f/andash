import { blogRouter } from "./routers/blog";
import { cfpRouter } from "./routers/cfp";
import { publicProcedure, router } from "./trpc";

export const appRouter = router({
  cfp: cfpRouter,
  blog: blogRouter,
  health: publicProcedure.query(() => ({ status: "ok" })),
});

export type AppRouter = typeof appRouter;
