import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { db } from '@/app/db';
import { playerInventory, playerStats, playerTsumegoRecords, tsumegoProblems } from '@/src/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { addRewards } from '@/src/lib/experience-manager';

/**
 * POST /api/tsumego/reward
 * 发放死活题奖励（优化版本）
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

    // 并行获取题目和玩家信息
    const [problem, player] = await Promise.all([
      db.query.tsumegoProblems.findFirst({
        where: eq(tsumegoProblems.id, problemId),
      }),
      db.query.playerStats.findFirst({
        where: eq(playerStats.userId, session.user.id),
      }),
    ]);

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const rewards = {
      experience: 0,
      silver: 0,
      items: [] as Array<string | { itemId: string; name: string; quantity: number }>,
    };

    // 优化后的批量添加物品函数
    const addInventoryItemsBatch = async (entries: Array<{ itemId: string; quantity: number }>) => {
      if (entries.length === 0) return;

      // 并行处理所有物品
      await Promise.all(
        entries.map(async (entry) => {
          if (!entry.itemId || entry.quantity <= 0) return;

          // 使用 ON CONFLICT 一次性完成 upsert
          await db
            .insert(playerInventory)
            .values({
              userId: session.user.id,
              itemId: entry.itemId,
              quantity: entry.quantity,
            })
            .onConflictDoUpdate({
              target: [playerInventory.userId, playerInventory.itemId],
              set: {
                quantity: sql`player_inventory.quantity + ${entry.quantity}`,
                updatedAt: new Date(),
              },
            });
        })
      );
    };

    if (success) {
      // 成功时发放奖励
      rewards.experience = problem.experienceReward;
      rewards.silver = problem.difficulty * 10;

      const itemsToAdd: Array<{ itemId: string; quantity: number }> = [];

      // 根据难度随机掉落物品
      if (problem.difficulty >= 7) {
        if (Math.random() < 0.3) {
          rewards.items.push('高级丹药');
        }
        if (Math.random() < 0.2) {
          rewards.items.push('武学秘籍残页');
        }
      } else if (problem.difficulty >= 4) {
        if (Math.random() < 0.4) {
          rewards.items.push('中级丹药');
        }
      } else {
        if (Math.random() < 0.5) {
          rewards.items.push('初级丹药');
        }
      }

      // 资源遭遇奖励
      if (source === 'tree' || source === 'bamboo' || source === 'rock') {
        let resourceReward;

        if (source === 'tree') {
          resourceReward = { itemId: 'wood', name: '木材', quantity: 1 };
        } else if (source === 'bamboo') {
          resourceReward = { itemId: 'bamboo', name: '竹子', quantity: 1 };
        } else if (source === 'rock') {
          const stoneCount = Math.floor(Math.random() * 41) + 10;
          resourceReward = { itemId: 'stone', name: '石子', quantity: stoneCount };
        }

        if (resourceReward) {
          rewards.items.push(resourceReward);
          itemsToAdd.push({ itemId: resourceReward.itemId, quantity: resourceReward.quantity });
        }
      }

      // 并行执行：更新经验银两 + 添加物品 + 记录解题历史
      await Promise.all([
        addRewards(session.user.id, {
          experience: rewards.experience,
          silver: rewards.silver,
        }),
        itemsToAdd.length > 0 ? addInventoryItemsBatch(itemsToAdd) : Promise.resolve(),
        db.insert(playerTsumegoRecords).values({
          userId: session.user.id,
          problemId: problem.id,
          solved: success,
          attempts: attempts || 1,
        }),
      ]);
    } else {
      // 失败也记录
      await db.insert(playerTsumegoRecords).values({
        userId: session.user.id,
        problemId: problem.id,
        solved: false,
        attempts: attempts || 1,
      });
    }

    // 移除成就检查的同步调用 - 改为后台任务或客户端调用
    // 不要在这个关键路径上阻塞

    return NextResponse.json({
      success: true,
      rewards,
      newExperience: player.experience + rewards.experience,
      newSilver: player.silver + rewards.silver,
      // 客户端可以自己调用 /api/achievements 检查
    });
  } catch (error) {
    console.error('Error processing tsumego reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
