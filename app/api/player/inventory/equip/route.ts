/**
 * 装备物品 API
 * POST /api/player/inventory/equip - 装备/卸下背包中的装备
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '../../../../../src/db';
import { playerInventory, items } from '../../../../../src/db/schema';
import { and, eq, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { inventoryId, equip } = body as { inventoryId?: number; equip?: boolean };

    if (!inventoryId || typeof equip !== 'boolean') {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }

    const inventoryItem = await db
      .select({
        inventory: playerInventory,
        item: items,
      })
      .from(playerInventory)
      .leftJoin(items, eq(playerInventory.itemId, items.itemId))
      .where(and(eq(playerInventory.id, inventoryId), eq(playerInventory.userId, userId)))
      .limit(1);

    if (inventoryItem.length === 0 || !inventoryItem[0].item) {
      return NextResponse.json({ error: '物品不存在' }, { status: 404 });
    }

    const { inventory, item } = inventoryItem[0];

    if (item.itemType !== 'equipment') {
      return NextResponse.json({ error: '该物品不可装备' }, { status: 400 });
    }

    const itemId = item.itemId;
    const isGoBoard = itemId.startsWith('go_board_');
    const isGoBowl = itemId.startsWith('go_bowl_');
    const slot = isGoBoard ? 'go_board' : isGoBowl ? 'go_bowl' : 'treasure';

    if (equip && !inventory.equipped) {
      // 棋盘和棋罐：检查同类装备冲突
      if (isGoBoard || isGoBowl) {
        const sameSlot = await db
          .select({ id: playerInventory.id })
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
          .select({ count: sql<number>`count(*)` })
          .from(playerInventory)
          .where(
            and(
              eq(playerInventory.userId, userId),
              eq(playerInventory.equipped, true),
              eq(playerInventory.slot, 'treasure')
            )
          );

        if ((equippedTreasures[0]?.count ?? 0) >= 3) {
          return NextResponse.json({ error: '最多只能装备3件宝物' }, { status: 400 });
        }
      }
    }

    await db
      .update(playerInventory)
      .set({
        equipped: equip,
        slot: equip ? slot : null,
        updatedAt: new Date(),
      })
      .where(eq(playerInventory.id, inventoryId));

    return NextResponse.json({
      success: true,
      message: equip ? `已装备 ${item.name}` : `已卸下 ${item.name}`,
    });
  } catch (error) {
    console.error('装备物品失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
