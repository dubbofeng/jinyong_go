/**
 * 更新玩家属性 API
 * PATCH /api/player/stats/update - 更新体力、内力、经验等
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '../../../../../src/db';
import { playerStats, gameProgress, playerInventory, items } from '../../../../../src/db/schema';
import { and, eq } from 'drizzle-orm';
import { getExperienceForLevel } from '../../../../../src/lib/rank-system';
import { getActualMaxStats } from '../../../../../src/lib/player-stats-utils';
import { addRewards } from '@/lib/experience-manager';

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();

    // 获取当前属性
    const current = await db
      .select()
      .from(playerStats)
      .where(eq(playerStats.userId, userId))
      .limit(1);

    if (current.length === 0) {
      return NextResponse.json(
        { error: '玩家属性未初始化' },
        { status: 404 }
      );
    }

    const stats = current[0];

    // 获取装备加成
    const { actualMaxStamina, actualMaxQi } = await getActualMaxStats(
      stats.maxStamina,
      stats.maxQi,
      userId
    );

    // 构建更新对象
    const updates: any = {
      updatedAt: new Date(),
    };

    // 体力变化
    if (body.staminaDelta !== undefined) {
      const newStamina = Math.max(0, Math.min(actualMaxStamina, stats.stamina + body.staminaDelta));
      updates.stamina = newStamina;
      updates.lastStaminaRegen = new Date();
    }

    // 内力变化
    if (body.qiDelta !== undefined) {
      const newQi = Math.max(0, Math.min(actualMaxQi, stats.qi + body.qiDelta));
      updates.qi = newQi;
      updates.lastQiRegen = new Date();
    }

    // 经验变化（使用统一的经验管理器）
    let levelDelta = 0;
    let experienceResult;
    if (body.experienceDelta !== undefined && body.experienceDelta !== 0) {
      experienceResult = await addRewards(userId, {
        experience: body.experienceDelta,
      });
      levelDelta = experienceResult.newLevel - experienceResult.oldLevel;
      
      // 如果有升级，满血满蓝
      if (levelDelta > 0) {
        const [updatedStats] = await db
          .select()
          .from(playerStats)
          .where(eq(playerStats.userId, userId))
          .limit(1);
        if (updatedStats) {
          updates.stamina = updatedStats.maxStamina;
          updates.qi = updatedStats.maxQi;
        }
      }
    }

    // 货币变化
    if (body.coinsDelta !== undefined) {
      updates.coins = Math.max(0, stats.coins + body.coinsDelta);
    }
    if (body.silverDelta !== undefined) {
      updates.silver = Math.max(0, stats.silver + body.silverDelta);
    }

    // 更新数据库
    const updated = await db
      .update(playerStats)
      .set(updates)
      .where(eq(playerStats.userId, userId))
      .returning();

    if (body.experienceDelta !== undefined) {
      const progress = await db.query.gameProgress.findFirst({
        where: eq(gameProgress.userId, userId),
      });

      if (progress) {
        const nextSkillPoints = progress.skillPoints + Math.max(0, levelDelta);
        await db
          .update(gameProgress)
          .set({
            skillPoints: nextSkillPoints,
            updatedAt: new Date(),
          })
          .where(eq(gameProgress.userId, userId));
      }
    }

    return NextResponse.json({
      success: true,
      data: updated[0],
      levelUp: updates.level && updates.level > stats.level,
    });
  } catch (error) {
    console.error('更新玩家属性失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
