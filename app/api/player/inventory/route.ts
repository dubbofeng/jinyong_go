/**
 * 玩家背包 API
 * GET /api/player/inventory - 获取背包物品
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { db } from '../../../../src/db';
import { playerInventory, items } from '../../../../src/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);

    // 获取玩家所有物品，联表查询物品详情
    const inventory = await db
      .select({
        id: playerInventory.id,
        itemId: playerInventory.itemId,
        quantity: playerInventory.quantity,
        equipped: playerInventory.equipped,
        slot: playerInventory.slot,
        obtainedAt: playerInventory.obtainedAt,
        // 物品详情
        item: {
          itemId: items.itemId,
          name: items.name,
          nameEn: items.nameEn,
          description: items.description,
            descriptionEn: items.descriptionEn,
          itemType: items.itemType,
          rarity: items.rarity,
          effects: items.effects,
          price: items.price,
          sellPrice: items.sellPrice,
          stackable: items.stackable,
          maxStack: items.maxStack,
          imagePath: items.imagePath, // 修复：使用正确的字段名
        },
      })
      .from(playerInventory)
      .leftJoin(items, eq(playerInventory.itemId, items.itemId))
      .where(eq(playerInventory.userId, userId));

    return NextResponse.json({
      success: true,
      data: inventory,
      count: inventory.length,
    });
  } catch (error) {
    console.error('获取背包失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
