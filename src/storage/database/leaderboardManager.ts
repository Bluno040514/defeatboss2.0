import { eq, desc, and, SQL } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import {
  leaderboard,
  insertLeaderboardSchema,
  type Leaderboard,
  type InsertLeaderboard,
} from "./shared/schema";

export class LeaderboardManager {
  /**
   * 创建排行榜记录
   */
  async createRecord(data: InsertLeaderboard): Promise<Leaderboard> {
    const db = await getDb();
    const validated = insertLeaderboardSchema.parse(data);
    const [record] = await db.insert(leaderboard).values(validated).returning();
    return record;
  }

  /**
   * 获取排行榜列表（按分数降序）
   */
  async getLeaderboard(options: {
    limit?: number;
    gameMode?: string;
  } = {}): Promise<Leaderboard[]> {
    const { limit = 100, gameMode } = options;
    const db = await getDb();

    const conditions: SQL[] = [];
    if (gameMode !== undefined) {
      conditions.push(eq(leaderboard.gameMode, gameMode));
    }

    if (conditions.length > 0) {
      return db
        .select()
        .from(leaderboard)
        .where(and(...conditions))
        .orderBy(desc(leaderboard.score))
        .limit(limit);
    }

    return db
      .select()
      .from(leaderboard)
      .orderBy(desc(leaderboard.score))
      .limit(limit);
  }

  /**
   * 获取玩家排名
   */
  async getPlayerRank(score: number, gameMode?: string): Promise<number> {
    const db = await getDb();

    const conditions: SQL[] = [eq(leaderboard.score, score)];
    if (gameMode !== undefined) {
      conditions.push(eq(leaderboard.gameMode, gameMode));
    }

    const records = await db
      .select()
      .from(leaderboard)
      .where(and(...conditions))
      .orderBy(desc(leaderboard.score), desc(leaderboard.createdAt));

    if (records.length === 0) {
      return 0;
    }

    // 找到最早记录的位置
    const earliestRecord = records[records.length - 1];
    const allRecords = gameMode
      ? await db
          .select()
          .from(leaderboard)
          .where(eq(leaderboard.gameMode, gameMode))
          .orderBy(desc(leaderboard.score), desc(leaderboard.createdAt))
      : await db
          .select()
          .from(leaderboard)
          .orderBy(desc(leaderboard.score), desc(leaderboard.createdAt));

    for (let i = 0; i < allRecords.length; i++) {
      if (allRecords[i].id === earliestRecord.id) {
        return i + 1;
      }
    }

    return 0;
  }

  /**
   * 删除记录
   */
  async deleteRecord(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(leaderboard).where(eq(leaderboard.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * 获取Top记录
   */
  async getTopRecords(count: number = 10, gameMode?: string): Promise<Leaderboard[]> {
    return this.getLeaderboard({ limit: count, gameMode });
  }
}

export const leaderboardManager = new LeaderboardManager();
