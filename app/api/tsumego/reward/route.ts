import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { db } from '@/app/db';
import { playerInventory, playerStats, playerTsumegoRecords, tsumegoProblems } from '@/src/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { addRewards } from '@/src/lib/experience-manager';

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

    const { problemId, success, attempts, timeSpent, source } = await request.json();

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

    const rewards = {
      experience: 0,
      silver: 0,
      items: [] as Array<string | { itemId: string; name: string; quantity: number }>,
    };

    const addInventoryItems = async (entries: Array<{ itemId: string; quantity: number }>) => {
      for (const entry of entries) {
        if (!entry.itemId || entry.quantity <= 0) continue;
        const existing = await db
          .select({ id: playerInventory.id })
          .from(playerInventory)
          .where(and(eq(playerInventory.userId, session.user.id), eq(playerInventory.itemId, entry.itemId)))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(playerInventory)
            .set({
              quantity: sql`${playerInventory.quantity} + ${entry.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(playerInventory.id, existing[0].id));
        } else {
          await db.insert(playerInventory).values({
            userId: session.user.id,
            itemId: entry.itemId,
            quantity: entry.quantity,
          });
        }
      }
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

      // 资源遭遇奖励（根据资源类型给予对应材料）
      if (source === 'tree' || source === 'bamboo' || source === 'rock') {
        let resourceReward;
        
        if (source === 'tree') {
          // 打败大树死活题 - 只奖励木材
          resourceReward = { itemId: 'wood', name: '木材', quantity: 1 };
        } else if (source === 'bamboo') {
          // 打败竹子死活题 - 只奖励竹子
          resourceReward = { itemId: 'bamboo', name: '竹子', quantity: 1 };
        } else if (source === 'rock') {
          // 打败石头死活题 - 只奖励石子
          const stoneCount = Math.floor(Math.random() * 41) + 10; // 10-50
          resourceReward = { itemId: 'stone', name: '石子', quantity: stoneCount };
        }
        
        if (resourceReward) {
          rewards.items.push(resourceReward);
          await addInventoryItems([{ itemId: resourceReward.itemId, quantity: resourceReward.quantity }]);
        }
      }

      // 更新玩家经验、等级和银两
      const rewardResult = await addRewards(session.user.id, {
        experience: rewards.experience,
        silver: rewards.silver,
      });
    }

    // 记录解题历史
    await db.insert(playerTsumegoRecords).values({
      userId: session.user.id,
      problemId: problem.id,
      solved: success,
      attempts: attempts || 1,
    });

    // 检查并解锁成就
    let newAchievements = [];
    try {
      const achievementResponse = await fetch(
        `${request.url.replace('/tsumego/reward', '/achievements')}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id }),
        }
      );
      
      if (achievementResponse.ok) {
        const data = await achievementResponse.json();
        newAchievements = data.newAchievements || [];
      }
    } catch (error) {
      console.error('检查成就失败:', error);
      // 不影响主流程，继续返回奖励
    }

    return NextResponse.json({
      success: true,
      rewards,
      newExperience: player.experience + rewards.experience,
      newSilver: player.silver + rewards.silver,
      newAchievements,
    });
  } catch (error) {
    console.error('Error processing tsumego reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
