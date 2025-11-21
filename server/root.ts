import { cfpRouter } from "./routers/cfp";
import { publicProcedure, router } from "./trpc";

export const appRouter = router({
  cfp: cfpRouter,
  health: publicProcedure.query(() => ({ status: "ok" })),
});

export type AppRouter = typeof appRouter;
