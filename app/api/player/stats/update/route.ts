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
    const equippedItems = await db
      .select({
        effects: items.effects,
      })
      .from(playerInventory)
      .leftJoin(items, eq(playerInventory.itemId, items.itemId))
      .where(
        and(
          eq(playerInventory.userId, userId),
          eq(playerInventory.equipped, true),
          eq(items.itemType, 'equipment')
        )
      );

    const bonus = equippedItems.reduce(
      (acc, cur) => {
        const effects = (cur.effects as any) || {};
        acc.maxStamina += effects.maxStamina || 0;
        acc.maxQi += effects.maxQi || 0;
        return acc;
      },
      { maxStamina: 0, maxQi: 0 }
    );

    const actualMaxStamina = stats.maxStamina + bonus.maxStamina;
    const actualMaxQi = stats.maxQi + bonus.maxQi;

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

    // 经验变化
    let levelDelta = 0;
    if (body.experienceDelta !== undefined) {
      let newExp = stats.experience + body.experienceDelta;
      let newLevel = stats.level;
      let expToNext = stats.experienceToNext;
      let maxStamina = stats.maxStamina;
      let maxQi = stats.maxQi;

      // 检查升级 (最高段位是9d = level 27)
      while (newExp >= expToNext && newLevel < 27) {
        newExp -= expToNext;
        newLevel++;
        expToNext = getExperienceForLevel(newLevel);
        
        // 升级奖励：+10 最大体力和内力
        maxStamina += 10;
        maxQi += 10;
      }
      
      // 如果达到最高段位，经验不再累积
      if (newLevel >= 27) {
        newExp = 0;
        expToNext = 0;
      }

      levelDelta = newLevel - stats.level;
      updates.experience = newExp;
      updates.level = newLevel;
      updates.experienceToNext = expToNext;
      
      // 如果有升级，应用升级奖励
      if (newLevel > stats.level) {
        updates.maxStamina = maxStamina;
        updates.maxQi = maxQi;
        updates.stamina = maxStamina; // 满血满蓝
        updates.qi = maxQi;
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
