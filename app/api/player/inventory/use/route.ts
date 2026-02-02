/**
 * 使用物品 API
 * POST /api/player/inventory/use - 使用背包中的物品
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '../../../../../src/db';
import { playerInventory, items, playerStats } from '../../../../../src/db/schema';
import { eq, and } from 'drizzle-orm';

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
    const body = await request.json();
    const { inventoryId } = body;

    if (!inventoryId) {
      return NextResponse.json(
        { error: '参数错误' },
        { status: 400 }
      );
    }

    // 获取物品信息
    const inventoryItem = await db
      .select({
        inventory: playerInventory,
        item: items,
      })
      .from(playerInventory)
      .leftJoin(items, eq(playerInventory.itemId, items.itemId))
      .where(
        and(
          eq(playerInventory.id, inventoryId),
          eq(playerInventory.userId, userId)
        )
      )
      .limit(1);

    if (inventoryItem.length === 0) {
      return NextResponse.json(
        { error: '物品不存在' },
        { status: 404 }
      );
    }

    const { inventory, item } = inventoryItem[0];

    if (!item) {
      return NextResponse.json(
        { error: '物品数据错误' },
        { status: 500 }
      );
    }

    if (item.itemType === 'equipment') {
      return NextResponse.json(
        { error: '装备请在背包中装备/卸下' },
        { status: 400 }
      );
    }

    // 检查数量
    if (inventory.quantity <= 0) {
      return NextResponse.json(
        { error: '物品数量不足' },
        { status: 400 }
      );
    }

    // 应用物品效果
    const effects = item.effects as any;
    const updates: any = {};

    if (effects.stamina) {
      updates.staminaDelta = effects.stamina;
    }
    if (effects.qi) {
      updates.qiDelta = effects.qi;
    }
    if (effects.experience) {
      updates.experienceDelta = effects.experience;
    }

    // 更新玩家属性
    if (Object.keys(updates).length > 0) {
      const stats = await db
        .select()
        .from(playerStats)
        .where(eq(playerStats.userId, userId))
        .limit(1);

      if (stats.length > 0) {
        const current = stats[0];
        const statUpdates: any = { updatedAt: new Date() };

        if (updates.staminaDelta) {
          statUpdates.stamina = Math.min(current.maxStamina, current.stamina + updates.staminaDelta);
          statUpdates.lastStaminaRegen = new Date();
        }
        if (updates.qiDelta) {
          statUpdates.qi = Math.min(current.maxQi, current.qi + updates.qiDelta);
          statUpdates.lastQiRegen = new Date();
        }
        if (updates.experienceDelta) {
          let newExp = current.experience + updates.experienceDelta;
          let newLevel = current.level;
          let expToNext = current.experienceToNext;

          while (newExp >= expToNext && newLevel < 100) {
            newExp -= expToNext;
            newLevel++;
            expToNext = Math.floor(100 * newLevel * 1.5);
            statUpdates.maxStamina = current.maxStamina + 10;
            statUpdates.maxQi = current.maxQi + 10;
          }

          statUpdates.experience = newExp;
          statUpdates.level = newLevel;
          statUpdates.experienceToNext = expToNext;
        }

        await db
          .update(playerStats)
          .set(statUpdates)
          .where(eq(playerStats.userId, userId));
      }
    }

    // 减少物品数量
    const newQuantity = inventory.quantity - 1;

    if (newQuantity <= 0) {
      // 删除物品
      await db
        .delete(playerInventory)
        .where(eq(playerInventory.id, inventoryId));
    } else {
      // 减少数量
      await db
        .update(playerInventory)
        .set({
          quantity: newQuantity,
          updatedAt: new Date(),
        })
        .where(eq(playerInventory.id, inventoryId));
    }

    return NextResponse.json({
      success: true,
      message: `使用了 ${item.name}`,
      effects: effects,
      remaining: newQuantity,
    });
  } catch (error) {
    console.error('使用物品失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
