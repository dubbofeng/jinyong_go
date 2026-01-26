import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { db } from '@/app/db';
import { playerStats, playerTsumegoRecords, tsumegoProblems } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/tsumego/reward
 * 发放死活题奖励
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { problemId, success, attempts, timeSpent } = await request.json();

    if (!problemId || typeof success !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // 获取题目信息
    const problem = await db.query.tsumegoProblems.findFirst({
      where: eq(tsumegoProblems.id, problemId),
    });

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    // 获取玩家信息
    const player = await db.query.playerStats.findFirst({
      where: eq(playerStats.userId, session.user.id),
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    let rewards = {
      experience: 0,
      silver: 0,
      items: [] as string[],
    };

    if (success) {
      // 成功时发放奖励
      rewards.experience = problem.experienceReward;
      
      // 根据难度发放银两
      rewards.silver = problem.difficulty * 10;
      
      // 根据难度随机掉落物品
      if (problem.difficulty >= 7) {
        // 高难度：有机会掉落稀有物品
        if (Math.random() < 0.3) {
          rewards.items.push('高级丹药');
        }
        if (Math.random() < 0.2) {
          rewards.items.push('武学秘籍残页');
        }
      } else if (problem.difficulty >= 4) {
        // 中等难度：普通物品
        if (Math.random() < 0.4) {
          rewards.items.push('中级丹药');
        }
      } else {
        // 低难度：基础物品
        if (Math.random() < 0.5) {
          rewards.items.push('初级丹药');
        }
      }

      // 更新玩家经验和银两
      await db
        .update(playerStats)
        .set({
          experience: player.experience + rewards.experience,
          silver: player.silver + rewards.silver,
        })
        .where(eq(playerStats.id, player.id));
    }

    // 记录解题历史
    await db.insert(playerTsumegoRecords).values({
      userId: session.user.id,
      problemId: problem.id,
      solved: success,
      attempts: attempts || 1,
    });

    return NextResponse.json({
      success: true,
      rewards,
      newExperience: player.experience + rewards.experience,
      newSilver: player.silver + rewards.silver,
    });
  } catch (error) {
    console.error('Error processing tsumego reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
