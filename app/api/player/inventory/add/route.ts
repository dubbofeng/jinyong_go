/**
 * 玩家背包 API
 * POST /api/player/inventory/add - 添加物品到背包
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '../../../../../src/db';
import { playerInventory } from '../../../../../src/db/schema';
import { and, eq, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();

    const items: Array<{ itemId: string | number; quantity?: number }> = body?.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: '缺少物品参数' }, { status: 400 });
    }

    const applied: Array<{ itemId: string; quantity: number }> = [];

    for (const item of items) {
      const itemId = String(item?.itemId || '');
      const quantity = Math.max(0, Number(item?.quantity ?? 1));
      if (!itemId || quantity <= 0) continue;

      const existing = await db
        .select({ id: playerInventory.id })
        .from(playerInventory)
        .where(and(eq(playerInventory.userId, userId), eq(playerInventory.itemId, itemId)));

      if (existing.length > 0) {
        await db
          .update(playerInventory)
          .set({
            quantity: sql`${playerInventory.quantity} + ${quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(playerInventory.id, existing[0].id));
      } else {
        await db.insert(playerInventory).values({
          userId,
          itemId,
          quantity,
        });
      }

      applied.push({ itemId, quantity });
    }

    return NextResponse.json({ success: true, data: applied });
  } catch (error) {
    console.error('添加背包物品失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
