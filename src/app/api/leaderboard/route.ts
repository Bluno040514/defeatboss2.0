import { NextRequest, NextResponse } from "next/server";
import { leaderboardManager } from "@/storage/database/leaderboardManager";

// GET /api/leaderboard - 获取排行榜
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const gameMode = searchParams.get("gameMode") || undefined;

    const records = await leaderboardManager.getLeaderboard({ limit, gameMode });

    return NextResponse.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("获取排行榜失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "获取排行榜失败",
      },
      { status: 500 }
    );
  }
}

// POST /api/leaderboard - 创建排行榜记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const record = await leaderboardManager.createRecord(body);

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("创建排行榜记录失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "创建排行榜记录失败",
      },
      { status: 500 }
    );
  }
}
