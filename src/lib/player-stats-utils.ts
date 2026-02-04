/**
 * 玩家属性工具函数
 * 提供装备加成计算等通用功能
 */

import { db } from '@/app/db';
import { playerInventory, items } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * 获取玩家装备加成
 * @param userId - 玩家ID
 * @returns 装备提供的最大体力和内力加成
 */
export async function getEquipmentBonus(userId: number): Promise<{
  maxStamina: number;
  maxQi: number;
}> {
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

  return bonus;
}

/**
 * 获取装备加成后的实际最大体力和内力
 * @param baseMaxStamina - 基础最大体力
 * @param baseMaxQi - 基础最大内力
 * @param userId - 玩家ID
 * @returns 实际最大体力和内力（包含装备加成）
 */
export async function getActualMaxStats(
  baseMaxStamina: number,
  baseMaxQi: number,
  userId: number
): Promise<{
  actualMaxStamina: number;
  actualMaxQi: number;
  bonus: { maxStamina: number; maxQi: number };
}> {
  const bonus = await getEquipmentBonus(userId);
  
  return {
    actualMaxStamina: baseMaxStamina + bonus.maxStamina,
    actualMaxQi: baseMaxQi + bonus.maxQi,
    bonus,
  };
}
