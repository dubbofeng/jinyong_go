import { NextResponse } from 'next/server';
import {
  db,
  achievements,
  playerAchievements,
  playerTsumegoRecords,
  tsumegoProblems,
  playerStats,
  playerInventory,
} from '@/src/db';
import { eq, and, sql } from 'drizzle-orm';

// 检查并解锁成就
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const newAchievements: any[] = [];

    // 获取所有成就定义
    const allAchievements = await db.select().from(achievements);

    // 获取玩家已解锁的成就
    const unlockedAchievements = await db
      .select()
      .from(playerAchievements)
      .where(and(eq(playerAchievements.userId, userId), eq(playerAchievements.unlocked, true)));

    const unlockedIds = new Set(unlockedAchievements.map((a: any) => a.achievementId));

    // 获取玩家死活题统计
    const solveCount = await db
      .select({
        total: sql<number>`COUNT(*)`,
      })
      .from(playerTsumegoRecords)
      .where(and(eq(playerTsumegoRecords.userId, userId), eq(playerTsumegoRecords.solved, true)));

    const totalSolved = Number(solveCount[0]?.total || 0);

    // 获取最高难度解决记录
    const maxDifficulty = await db
      .select({
        maxDiff: sql<number>`MAX(${tsumegoProblems.difficulty})`,
      })
      .from(playerTsumegoRecords)
      .innerJoin(tsumegoProblems, eq(playerTsumegoRecords.problemId, tsumegoProblems.id))
      .where(and(eq(playerTsumegoRecords.userId, userId), eq(playerTsumegoRecords.solved, true)));

    const maxDiff = Number(maxDifficulty[0]?.maxDiff || 0);

    // 获取一次成功数
    const firstTryCount = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(playerTsumegoRecords)
      .where(
        and(
          eq(playerTsumegoRecords.userId, userId),
          eq(playerTsumegoRecords.solved, true),
          eq(playerTsumegoRecords.attempts, 1)
        )
      );

    const firstTryTotal = Number(firstTryCount[0]?.count || 0);

    // 获取最大连胜（简化版本：从最近100条记录计算）
    const recentRecords = await db
      .select({
        solved: playerTsumegoRecords.solved,
      })
      .from(playerTsumegoRecords)
      .where(eq(playerTsumegoRecords.userId, userId))
      .orderBy(playerTsumegoRecords.lastAttemptedAt)
      .limit(100);

    let maxStreak = 0;
    let tempStreak = 0;
    for (const record of recentRecords) {
      if (record.solved) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // 检查每个成就
    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement.achievementId)) {
        continue; // 已解锁，跳过
      }

      let shouldUnlock = false;
      let progress = 0;

      switch (achievement.requirement.type) {
        case 'solve_count':
          progress = totalSolved;
          shouldUnlock = totalSolved >= achievement.requirement.value;
          break;

        case 'solve_difficulty':
          progress = maxDiff;
          shouldUnlock = maxDiff >= achievement.requirement.value;
          break;

        case 'first_try':
          progress = firstTryTotal;
          shouldUnlock = firstTryTotal >= achievement.requirement.value;
          break;

        case 'win_streak':
          progress = maxStreak;
          shouldUnlock = maxStreak >= achievement.requirement.value;
          break;

        case 'defeat_npc':
          // TODO: 实现对战成就检查
          progress = 0;
          shouldUnlock = false;
          break;
      }

      // 更新或创建玩家成就进度
      const existing = await db
        .select()
        .from(playerAchievements)
        .where(
          and(
            eq(playerAchievements.userId, userId),
            eq(playerAchievements.achievementId, achievement.achievementId)
          )
        );

      if (existing.length > 0) {
        // 更新进度
        await db
          .update(playerAchievements)
          .set({
            progress,
            unlocked: shouldUnlock,
            unlockedAt: shouldUnlock ? new Date() : existing[0].unlockedAt,
            updatedAt: new Date(),
          })
          .where(eq(playerAchievements.id, existing[0].id));
      } else {
        // 创建新记录
        await db.insert(playerAchievements).values({
          userId,
          achievementId: achievement.achievementId,
          progress,
          unlocked: shouldUnlock,
          unlockedAt: shouldUnlock ? new Date() : null,
        });
      }

      // 如果解锁了新成就，发放奖励
      if (shouldUnlock) {
        newAchievements.push(achievement);

        // 发放奖励
        if (achievement.reward) {
          const reward = achievement.reward;

          // 更新玩家经验和银两
          if (reward.experience || reward.silver) {
            const currentStats = await db
              .select()
              .from(playerStats)
              .where(eq(playerStats.userId, userId));

            if (currentStats.length > 0) {
              await db
                .update(playerStats)
                .set({
                  experience: sql`${playerStats.experience} + ${reward.experience || 0}`,
                  silver: sql`${playerStats.silver} + ${reward.silver || 0}`,
                  updatedAt: new Date(),
                })
                .where(eq(playerStats.userId, userId));
            }
          }

          // 单独处理coins（因为addRewards暂不支持）
          if (reward.coins) {
            await db
              .update(playerStats)
              .set({
                coins: sql`${playerStats.coins} + ${reward.coins}`,
                updatedAt: new Date(),
              })
              .where(eq(playerStats.userId, userId));
          }

          // 发放物品奖励
          if (reward.items && reward.items.length > 0) {
            for (const item of reward.items) {
              const existing = await db
                .select()
                .from(playerInventory)
                .where(
                  and(
                    eq(playerInventory.userId, userId),
                    eq(playerInventory.itemId, String(item.itemId))
                  )
                );

              if (existing.length > 0) {
                await db
                  .update(playerInventory)
                  .set({
                    quantity: sql`${playerInventory.quantity} + ${item.quantity}`,
                    updatedAt: new Date(),
                  })
                  .where(eq(playerInventory.id, existing[0].id));
              } else {
                await db.insert(playerInventory).values({
                  userId,
                  itemId: String(item.itemId),
                  quantity: item.quantity,
                });
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      newAchievements: newAchievements.map((a) => ({
        id: a.achievementId,
        name: a.name,
        nameEn: a.nameEn,
        description: a.description,
        descriptionEn: a.descriptionEn,
        icon: a.icon,
        reward: a.reward,
      })),
    });
  } catch (error) {
    console.error('检查成就失败:', error);
    return NextResponse.json({ error: 'Failed to check achievements' }, { status: 500 });
  }
}

// 获取玩家成就列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const userIdNum = parseInt(userId);

    // 获取所有成就和玩家进度
    const allAchievements = await db.select().from(achievements);

    const playerProgress = await db
      .select()
      .from(playerAchievements)
      .where(eq(playerAchievements.userId, userIdNum));

    const progressMap = new Map(playerProgress.map((p: any) => [p.achievementId, p]));

    const achievementsWithProgress = allAchievements.map((achievement: any) => {
      const progress: any = progressMap.get(achievement.achievementId);
      return {
        ...achievement,
        progress: progress?.progress || 0,
        unlocked: progress?.unlocked || false,
        unlockedAt: progress?.unlockedAt,
      };
    });

    // 按分类分组
    const grouped = achievementsWithProgress.reduce(
      (acc: any, achievement: any) => {
        if (!acc[achievement.category]) {
          acc[achievement.category] = [];
        }
        acc[achievement.category].push(achievement);
        return acc;
      },
      {} as Record<string, typeof achievementsWithProgress>
    );

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('获取成就列表失败:', error);
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
  }
}
