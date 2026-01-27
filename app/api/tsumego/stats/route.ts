import { NextResponse } from 'next/server';
import { db, playerTsumegoRecords, tsumegoProblems } from '@/src/db';
import { eq, and, sql, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    const userIdNum = parseInt(userId);

    // 1. 总体统计
    const totalStats = await db
      .select({
        totalAttempted: sql<number>`COUNT(DISTINCT ${playerTsumegoRecords.problemId})`,
        totalSolved: sql<number>`SUM(CASE WHEN ${playerTsumegoRecords.solved} THEN 1 ELSE 0 END)`,
        totalAttempts: sql<number>`SUM(${playerTsumegoRecords.attempts})`,
      })
      .from(playerTsumegoRecords)
      .where(eq(playerTsumegoRecords.userId, userIdNum));

    const stats = totalStats[0] || {
      totalAttempted: 0,
      totalSolved: 0,
      totalAttempts: 0,
    };

    // 2. 按难度统计
    const difficultyStats = await db
      .select({
        difficulty: tsumegoProblems.difficulty,
        attempted: sql<number>`COUNT(*)`,
        solved: sql<number>`SUM(CASE WHEN ${playerTsumegoRecords.solved} THEN 1 ELSE 0 END)`,
      })
      .from(playerTsumegoRecords)
      .innerJoin(
        tsumegoProblems,
        eq(playerTsumegoRecords.problemId, tsumegoProblems.id)
      )
      .where(eq(playerTsumegoRecords.userId, userIdNum))
      .groupBy(tsumegoProblems.difficulty)
      .orderBy(tsumegoProblems.difficulty);

    // 3. 连胜记录（最近的连续成功解题）
    const recentRecords = await db
      .select({
        solved: playerTsumegoRecords.solved,
        lastAttemptedAt: playerTsumegoRecords.lastAttemptedAt,
      })
      .from(playerTsumegoRecords)
      .where(eq(playerTsumegoRecords.userId, userIdNum))
      .orderBy(desc(playerTsumegoRecords.lastAttemptedAt))
      .limit(100);

    // 计算当前连胜和最高连胜
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    for (const record of recentRecords) {
      if (record.solved) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        if (currentStreak === 0) {
          // 只有在还没开始计算连胜时，遇到失败才重置
          tempStreak = 0;
        }
      }
    }
    currentStreak = tempStreak;

    // 4. 一次成功率（第一次尝试就成功的题目数）
    const firstTrySuccess = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(playerTsumegoRecords)
      .where(
        and(
          eq(playerTsumegoRecords.userId, userIdNum),
          eq(playerTsumegoRecords.solved, true),
          eq(playerTsumegoRecords.attempts, 1)
        )
      );

    const firstTryCount = firstTrySuccess[0]?.count || 0;

    // 5. 平均尝试次数（只计算已解决的）
    const avgAttemptsResult = await db
      .select({
        avgAttempts: sql<number>`AVG(${playerTsumegoRecords.attempts})`,
      })
      .from(playerTsumegoRecords)
      .where(
        and(
          eq(playerTsumegoRecords.userId, userIdNum),
          eq(playerTsumegoRecords.solved, true)
        )
      );

    const avgAttempts = avgAttemptsResult[0]?.avgAttempts || 0;

    return NextResponse.json({
      overview: {
        totalAttempted: Number(stats.totalAttempted),
        totalSolved: Number(stats.totalSolved),
        totalAttempts: Number(stats.totalAttempts),
        solveRate:
          Number(stats.totalAttempted) > 0
            ? (Number(stats.totalSolved) / Number(stats.totalAttempted)) * 100
            : 0,
        firstTryCount: Number(firstTryCount),
        firstTryRate:
          Number(stats.totalSolved) > 0
            ? (Number(firstTryCount) / Number(stats.totalSolved)) * 100
            : 0,
        avgAttempts: Math.round(Number(avgAttempts) * 10) / 10,
      },
      difficultyStats: difficultyStats.map((d: any) => ({
        difficulty: d.difficulty,
        attempted: Number(d.attempted),
        solved: Number(d.solved),
        solveRate:
          Number(d.attempted) > 0
            ? Math.round((Number(d.solved) / Number(d.attempted)) * 100)
            : 0,
      })),
      streaks: {
        current: currentStreak,
        max: maxStreak,
      },
    });
  } catch (error) {
    console.error('获取死活题统计失败:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tsumego statistics' },
      { status: 500 }
    );
  }
}
