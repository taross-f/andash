import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// For local development and edge runtime
export const db = drizzle(
  // @ts-expect-error - D1 binding will be available at runtime
  process.env.DB ?? globalThis.__D1_BETA__DB,
  { schema }
);

export { schema };
