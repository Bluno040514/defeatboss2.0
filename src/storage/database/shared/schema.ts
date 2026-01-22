import { pgTable, text, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

// 排行榜表
export const leaderboard = pgTable(
  "leaderboard",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    playerName: varchar("player_name", { length: 100 }).notNull(),
    score: integer("score").notNull(),
    maxCombo: integer("max_combo").notNull().default(0),
    gameMode: varchar("game_mode", { length: 50 }).notNull().default("moving"), // moving or static
    avatarUrl: text("avatar_url"), // 玩家头像URL（可选）
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    scoreIdx: index("leaderboard_score_idx").on(table.score),
    createdAtIdx: index("leaderboard_created_at_idx").on(table.createdAt),
  })
);

// Zod schemas for validation
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

export const insertLeaderboardSchema = createCoercedInsertSchema(leaderboard).pick({
  playerName: true,
  score: true,
  maxCombo: true,
  gameMode: true,
  avatarUrl: true,
});

// TypeScript types
export type Leaderboard = typeof leaderboard.$inferSelect;
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;




