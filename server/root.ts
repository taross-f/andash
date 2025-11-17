import { z } from "zod";
import { router, publicProcedure } from "./trpc";
import { cfpRouter } from "./routers/cfp";

export const appRouter = router({
  cfp: cfpRouter,
  health: publicProcedure.query(() => ({ status: "ok" })),
});

export type AppRouter = typeof appRouter;
