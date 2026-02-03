/**
 * 玩家属性 API
 * GET /api/player/stats - 获取玩家属性
 * POST /api/player/stats/init - 初始化玩家属性
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { db } from '../../../../src/db';
import { items, playerInventory, playerStats, users } from '../../../../src/db/schema';
import { and, eq, sql } from 'drizzle-orm';
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

/**
 * PATCH - 更新玩家属性（经验、银两、体力、内力等）
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      experience = 0, 
      silver = 0, 
      stamina = 0, 
      qi = 0,
      restoreAll = false 
    } = body;

    // 获取当前状态
    const currentStats = await db
      .select()
      .from(playerStats)
      .where(eq(playerStats.userId, parseInt(session.user.id)))
      .limit(1);

    if (currentStats.length === 0) {
      return NextResponse.json(
        { error: '玩家属性未找到' },
        { status: 404 }
      );
    }

    const current = currentStats[0];

    // 获取装备加成
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

    const actualMaxStamina = current.maxStamina + bonus.maxStamina;
    const actualMaxQi = current.maxQi + bonus.maxQi;

    // 检查银两是否足够
    if (silver < 0 && current.silver + silver < 0) {
      return NextResponse.json(
        { success: false, error: '银两不足' },
        { status: 400 }
      );
    }

    // 构建更新对象
    const updateData: any = {};

    if (experience !== 0) {
      updateData.experience = sql`${playerStats.experience} + ${experience}`;
    }

    if (silver !== 0) {
      updateData.silver = sql`${playerStats.silver} + ${silver}`;
    }

    if (restoreAll) {
      // 全部恢复（客栈休息）
      updateData.stamina = actualMaxStamina;
      updateData.qi = actualMaxQi;
    } else {
      // 增量更新
      if (stamina !== 0) {
        const newStamina = Math.min(actualMaxStamina, current.stamina + stamina);
        updateData.stamina = newStamina;
      }
      if (qi !== 0) {
        const newQi = Math.min(actualMaxQi, current.qi + qi);
        updateData.qi = newQi;
      }
    }

    // 更新玩家属性
    if (Object.keys(updateData).length > 0) {
      await db
        .update(playerStats)
        .set(updateData)
        .where(eq(playerStats.userId, parseInt(session.user.id)));
    }

    // 获取更新后的状态
    const updatedStats = await db
      .select()
      .from(playerStats)
      .where(eq(playerStats.userId, parseInt(session.user.id)))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: updatedStats[0],
    });
  } catch (error) {
    console.error('更新玩家属性失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
