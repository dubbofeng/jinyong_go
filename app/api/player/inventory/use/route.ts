/**
 * 使用物品 API
 * POST /api/player/inventory/use - 使用背包中的物品
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '../../../../../src/db';
import { playerInventory, items, playerStats } from '../../../../../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { getActualMaxStats } from '../../../../../src/lib/player-stats-utils';
import { addRewards } from '@/lib/experience-manager';

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

    // 如果是装备类型，自动转为装备逻辑
    if (item.itemType === 'equipment') {
      // 检查是否已装备
      const shouldEquip = !inventory.equipped;
      
      if (shouldEquip) {
        // 确定装备槽位
        const itemId = item.itemId;
        const isGoBoard = itemId.startsWith('go_board_');
        const isGoBowl = itemId.startsWith('go_bowl_');
        const slot = isGoBoard ? 'go_board' : isGoBowl ? 'go_bowl' : 'treasure';

        // 棋盘和棋罐：检查同类装备冲突
        if (isGoBoard || isGoBowl) {
          const sameSlot = await db
            .select()
            .from(playerInventory)
            .where(
              and(
                eq(playerInventory.userId, userId),
                eq(playerInventory.equipped, true),
                eq(playerInventory.slot, slot)
              )
            )
            .limit(1);

          if (sameSlot.length > 0) {
            return NextResponse.json(
              { error: isGoBoard ? '已装备棋盘，只能同时装备一个棋盘' : '已装备棋罐，只能同时装备一个棋罐' },
              { status: 400 }
            );
          }
        } else {
          // 宝物类装备：检查数量限制（最多3件）
          const equippedTreasures = await db
            .select()
            .from(playerInventory)
            .where(
              and(
                eq(playerInventory.userId, userId),
                eq(playerInventory.equipped, true),
                eq(playerInventory.slot, 'treasure')
              )
            );

          if (equippedTreasures.length >= 3) {
            return NextResponse.json(
              { error: '最多只能装备3件宝物' },
              { status: 400 }
            );
          }
        }

        // 装备
        await db
          .update(playerInventory)
          .set({
            equipped: true,
            slot: slot,
            updatedAt: new Date(),
          })
          .where(eq(playerInventory.id, inventoryId));

        return NextResponse.json({
          success: true,
          message: `已装备 ${item.name}`,
        });
      } else {
        // 卸下
        await db
          .update(playerInventory)
          .set({
            equipped: false,
            slot: null,
            updatedAt: new Date(),
          })
          .where(eq(playerInventory.id, inventoryId));

        return NextResponse.json({
          success: true,
          message: `已卸下 ${item.name}`,
        });
      }
    }

    // 检查数量
    if (inventory.quantity <= 0) {
      return NextResponse.json(
        { error: '物品数量不足' },
        { status: 400 }
      );
    }

    // 应用物品效果
    const effects = (item.effects as any) || {};
    const updates: any = {};

    console.log('Item:', item.itemId, 'Effects:', effects);

    if (effects && effects.stamina) {
      updates.staminaDelta = effects.stamina;
    }
    if (effects && effects.qi) {
      updates.qiDelta = effects.qi;
    }
    if (effects && effects.experience) {
      updates.experienceDelta = effects.experience;
    }

    // 更新玩家属性
    if (Object.keys(updates).length > 0) {
      const stats = await db
        .select()
        .from(playerStats)
        .where(eq(playerStats.userId, userId))
        .limit(1);

      if (stats.length > 0 && stats[0]) {
        const current = stats[0];
        
        // 计算装备加成
        const { actualMaxStamina, actualMaxQi } = await getActualMaxStats(
          current.maxStamina,
          current.maxQi,
          userId
        );
        
        const statUpdates: any = { updatedAt: new Date() };

        if (updates.staminaDelta) {
          statUpdates.stamina = Math.min(
            actualMaxStamina, 
            (current.stamina || 0) + updates.staminaDelta
          );
          statUpdates.lastStaminaRegen = new Date();
        }
        if (updates.qiDelta) {
          statUpdates.qi = Math.min(
            actualMaxQi, 
            (current.qi || 0) + updates.qiDelta
          );
          statUpdates.lastQiRegen = new Date();
        }
        // 使用统一的经验管理器处理经验和升级
        if (updates.experienceDelta) {
          await addRewards(userId, {
            experience: updates.experienceDelta,
          });
          // 获取更新后的数据用于返回
          const [updated] = await db
            .select()
            .from(playerStats)
            .where(eq(playerStats.userId, userId))
            .limit(1);
          if (updated) {
            Object.assign(statUpdates, {
              experience: updated.experience,
              level: updated.level,
              experienceToNext: updated.experienceToNext,
              maxStamina: updated.maxStamina,
              maxQi: updated.maxQi,
            });
          }
        }

        await db
          .update(playerStats)
          .set(statUpdates)
          .where(eq(playerStats.userId, userId));
      } else {
        return NextResponse.json(
          { error: '玩家数据不存在，请先创建角色' },
          { status: 404 }
        );
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
