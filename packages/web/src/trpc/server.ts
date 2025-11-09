import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const createContext = cache(async () => {
  const heads = await headers();

  return createTRPCContext({
    headers: heads,
  });
});

export const api = createCaller(createContext);
