import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { jobRouter } from "./routers/job";

export const appRouter = createTRPCRouter({
  job: jobRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
