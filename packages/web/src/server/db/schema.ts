import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conferenceUrl: text("conference_url").notNull(),
  pastUrls: text("past_urls"),
  numProposals: integer("num_proposals").notNull().default(8),
  language: text("language", { enum: ["ja", "en"] }).notNull().default("ja"),
  status: text("status", { enum: ["pending", "processing", "completed", "failed"] })
    .notNull()
    .default("pending"),
  result: text("result"), // JSON string of generated proposals
  reportUrl: text("report_url"), // R2 URL for markdown report
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});
