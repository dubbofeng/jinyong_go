/**
 * 玩家属性 API
 * GET /api/player/stats - 获取玩家属性
 * POST /api/player/stats/init - 初始化玩家属性
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { db } from '../../../../src/db';
import { items, playerInventory, playerStats, users } from '../../../../src/db/schema';
import { and, eq } from 'drizzle-orm';
import { getExperienceForLevel } from '../../../../src/lib/rank-system';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    // 获取玩家属性
    const stats = await db
      .select()
      .from(playerStats)
      .where(eq(playerStats.userId, parseInt(session.user.id)))
      .limit(1);

    if (stats.length === 0) {
      return NextResponse.json(
        { error: '玩家属性未初始化' },
        { status: 404 }
      );
    }

    const equippedItems = await db
      .select({
        effects: items.effects,
      })
      .from(playerInventory)
      .leftJoin(items, eq(playerInventory.itemId, items.itemId))
      .where(
        and(
          eq(playerInventory.userId, parseInt(session.user.id)),
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

    const base = stats[0];
    const maxStamina = base.maxStamina + bonus.maxStamina;
    const maxQi = base.maxQi + bonus.maxQi;

    return NextResponse.json({
      success: true,
      data: {
        ...base,
        maxStamina,
        maxQi,
        stamina: Math.min(base.stamina, maxStamina),
        qi: Math.min(base.qi, maxQi),
      },
    });
  } catch (error) {
    console.error('获取玩家属性失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);

    // 检查是否已存在
    const existing = await db
      .select()
      .from(playerStats)
      .where(eq(playerStats.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        data: existing[0],
        message: '玩家属性已存在',
      });
    }

    // 创建新玩家属性 (从18k开始 = level 1)
    const initialLevel = 1; // 18k
    const expToNext = getExperienceForLevel(initialLevel);
    
    const newStats = await db
      .insert(playerStats)
      .values({
        userId,
        level: initialLevel,
        experience: 0,
        experienceToNext: expToNext,
        stamina: 100,
        maxStamina: 100,
        staminaRegenRate: 1,
        qi: 100,
        maxQi: 100,
        qiRegenRate: 2,
        coins: 0,
        silver: 100,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newStats[0],
      message: '玩家属性初始化成功',
    });
  } catch (error) {
    console.error('初始化玩家属性失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
