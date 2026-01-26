/**
 * 更新玩家属性 API
 * PATCH /api/player/stats/update - 更新体力、内力、经验等
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '../../../../../src/db';
import { playerStats } from '../../../../../src/db/schema';
import { eq } from 'drizzle-orm';

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

    // 构建更新对象
    const updates: any = {
      updatedAt: new Date(),
    };

    // 体力变化
    if (body.staminaDelta !== undefined) {
      const newStamina = Math.max(0, Math.min(stats.maxStamina, stats.stamina + body.staminaDelta));
      updates.stamina = newStamina;
      updates.lastStaminaRegen = new Date();
    }

    // 内力变化
    if (body.qiDelta !== undefined) {
      const newQi = Math.max(0, Math.min(stats.maxQi, stats.qi + body.qiDelta));
      updates.qi = newQi;
      updates.lastQiRegen = new Date();
    }

    // 经验变化
    if (body.experienceDelta !== undefined) {
      let newExp = stats.experience + body.experienceDelta;
      let newLevel = stats.level;
      let expToNext = stats.experienceToNext;

      // 检查升级
      while (newExp >= expToNext && newLevel < 100) {
        newExp -= expToNext;
        newLevel++;
        expToNext = Math.floor(100 * newLevel * 1.5);
        
        // 升级奖励：+10 最大体力和内力
        updates.maxStamina = stats.maxStamina + 10;
        updates.maxQi = stats.maxQi + 10;
        updates.stamina = updates.maxStamina; // 满血满蓝
        updates.qi = updates.maxQi;
      }

      updates.experience = newExp;
      updates.level = newLevel;
      updates.experienceToNext = expToNext;
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
