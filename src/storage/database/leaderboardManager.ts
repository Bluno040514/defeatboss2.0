import { eq, desc, and, SQL } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import {
  leaderboard,
  insertLeaderboardSchema,
  type Leaderboard,
  type InsertLeaderboard,
} from "./shared/schema";

// 本地开发使用的内存数据库
class MemoryLeaderboardDB {
  private records: Leaderboard[] = [];
  
  async insert(record: Omit<Leaderboard, "id" | "createdAt">) {
    const now = new Date();
    const newRecord: Leaderboard = {
      ...record,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
    };
    this.records.push(newRecord);
    return [newRecord];
  }
  
  async select(options?: {
    where?: any;
    orderBy?: any;
    limit?: number;
  }) {
    let result = [...this.records];
    
    // 简单的过滤实现
    if (options?.where) {
      result = result.filter(record => {
        for (const [key, value] of Object.entries(options.where)) {
          if (record[key as keyof Leaderboard] !== value) {
            return false;
          }
        }
        return true;
      });
    }
    
    // 简单的排序实现
    if (options?.orderBy?.[0]?.[0]?.name === "score") {
      result.sort((a, b) => b.score - a.score);
    }
    
    // 简单的分页实现
    if (options?.limit) {
      result = result.slice(0, options.limit);
    }
    
    return result;
  }
  
  async delete(where: any) {
    const initialLength = this.records.length;
    this.records = this.records.filter(record => {
      for (const [key, value] of Object.entries(where)) {
        if (record[key as keyof Leaderboard] === value) {
          return false;
        }
      }
      return true;
    });
    return { rowCount: initialLength - this.records.length };
  }
}

const memoryDB = new MemoryLeaderboardDB();

export class LeaderboardManager {
  /**
   * 创建排行榜记录
   */
  async createRecord(data: InsertLeaderboard): Promise<Leaderboard> {
    try {
      // 尝试使用真实数据库
      const db = await getDb();
      const validated = insertLeaderboardSchema.parse(data);
      const [record] = await db.insert(leaderboard).values(validated).returning();
      return record;
    } catch (error) {
      // 如果真实数据库连接失败，使用内存数据库作为备选
      console.log("使用内存数据库保存排行榜记录");
      const validated = insertLeaderboardSchema.parse(data);
      const [record] = await memoryDB.insert(validated);
      return record;
    }
  }

  /**
   * 获取排行榜列表（按分数降序）
   */
  async getLeaderboard(options: {
    limit?: number;
    gameMode?: string;
  } = {}): Promise<Leaderboard[]> {
    const { limit = 100, gameMode } = options;
    
    try {
      // 尝试使用真实数据库
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
    } catch (error) {
      // 如果真实数据库连接失败，使用内存数据库作为备选
      console.log("使用内存数据库获取排行榜记录");
      
      const where: any = {};
      if (gameMode !== undefined) {
        where.gameMode = gameMode;
      }
      
      return memoryDB.select({
        where,
        orderBy: [[{ name: "score" }, "desc"]],
        limit,
      });
    }
  }

  /**
   * 获取玩家排名
   */
  async getPlayerRank(score: number, gameMode?: string): Promise<number> {
    try {
      // 尝试使用真实数据库
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
    } catch (error) {
      // 如果真实数据库连接失败，使用内存数据库作为备选
      console.log("使用内存数据库获取玩家排名");
      
      const allRecords = await memoryDB.select({
        where: gameMode ? { gameMode } : undefined,
        orderBy: [[{ name: "score" }, "desc"]],
      });
      
      const rank = allRecords.findIndex(record => record.score > score) + 1;
      return rank || allRecords.length + 1;
    }
  }

  /**
   * 删除记录
   */
  async deleteRecord(id: string): Promise<boolean> {
    try {
      // 尝试使用真实数据库
      const db = await getDb();
      const result = await db.delete(leaderboard).where(eq(leaderboard.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      // 如果真实数据库连接失败，使用内存数据库作为备选
      console.log("使用内存数据库删除记录");
      const result = await memoryDB.delete({ id });
      return result.rowCount > 0;
    }
  }

  /**
   * 获取Top记录
   */
  async getTopRecords(count: number = 10, gameMode?: string): Promise<Leaderboard[]> {
    return this.getLeaderboard({ limit: count, gameMode });
  }
}

export const leaderboardManager = new LeaderboardManager();
