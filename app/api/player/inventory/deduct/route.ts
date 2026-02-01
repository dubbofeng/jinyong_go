/**
 * 玩家背包扣除 API
 * POST /api/player/inventory/deduct - 扣除背包物品
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '../../../../../src/db';
import { playerInventory } from '../../../../../src/db/schema';
import { and, eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();

    const items: Array<{ itemId: string; quantity?: number }> = body?.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: '缺少物品参数' }, { status: 400 });
    }

    const normalized = items
      .map((item) => ({
        itemId: String(item?.itemId || ''),
        quantity: Math.max(0, Number(item?.quantity ?? 1)),
      }))
      .filter((item) => item.itemId && item.quantity > 0);

    if (normalized.length === 0) {
      return NextResponse.json({ error: '物品参数无效' }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const inventoryRows = await Promise.all(
        normalized.map((item) =>
          tx
            .select({ id: playerInventory.id, quantity: playerInventory.quantity })
            .from(playerInventory)
            .where(and(eq(playerInventory.userId, userId), eq(playerInventory.itemId, item.itemId)))
            .limit(1)
        )
      );

      for (let i = 0; i < normalized.length; i++) {
        const item = normalized[i];
        const row = inventoryRows[i]?.[0];
        if (!row) {
          return { ok: false, error: `缺少物品：${item.itemId}` } as const;
        }
        if (row.quantity < item.quantity) {
          return { ok: false, error: `物品数量不足：${item.itemId}` } as const;
        }
      }

      for (let i = 0; i < normalized.length; i++) {
        const item = normalized[i];
        const row = inventoryRows[i][0];
        const remaining = row.quantity - item.quantity;
        if (remaining <= 0) {
          await tx.delete(playerInventory).where(eq(playerInventory.id, row.id));
        } else {
          await tx
            .update(playerInventory)
            .set({ quantity: remaining, updatedAt: new Date() })
            .where(eq(playerInventory.id, row.id));
        }
      }

      return { ok: true } as const;
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('扣除物品失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
