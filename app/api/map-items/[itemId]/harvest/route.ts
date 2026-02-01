import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { db } from '@/app/db';
import { items, mapItems, playerInventory } from '@/src/db/schema';
import { and, eq, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const mapItemId = Number(params?.itemId);
    if (!mapItemId) {
      return NextResponse.json({ error: '无效的物品ID' }, { status: 400 });
    }

    const [mapItem] = await db
      .select({
        id: mapItems.id,
        collected: mapItems.collected,
        itemType: items.itemType,
        plantType: items.plantType,
        harvestable: items.harvestable,
        itemName: items.name,
      })
      .from(mapItems)
      .leftJoin(items, eq(mapItems.itemId, items.id))
      .where(eq(mapItems.id, mapItemId));

    if (!mapItem) {
      return NextResponse.json({ error: '物品不存在' }, { status: 404 });
    }

    if (mapItem.collected) {
      return NextResponse.json({ error: '该草药已采摘' }, { status: 400 });
    }

    const isHerb = mapItem.itemType === 'plant'
      && (mapItem.plantType === 'herb' || mapItem.itemName?.includes('草'));
    const harvestable = mapItem.harvestable !== false;
    if (!isHerb || !harvestable) {
      return NextResponse.json({ error: '无法采摘该物品' }, { status: 400 });
    }

    const userId = session.user.id;

    await db.transaction(async (tx) => {
      await tx
        .update(mapItems)
        .set({ collected: true, updatedAt: new Date() })
        .where(eq(mapItems.id, mapItemId));

      const existing = await tx
        .select({ id: playerInventory.id })
        .from(playerInventory)
        .where(and(eq(playerInventory.userId, userId), eq(playerInventory.itemId, 'herb')))
        .limit(1);

      if (existing.length > 0) {
        await tx
          .update(playerInventory)
          .set({
            quantity: sql`${playerInventory.quantity} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(playerInventory.id, existing[0].id));
      } else {
        await tx.insert(playerInventory).values({
          userId,
          itemId: 'herb',
          quantity: 1,
        });
      }
    });

    return NextResponse.json({
      success: true,
      reward: { itemId: 'herb', name: '草药', quantity: 1 },
    });
  } catch (error) {
    console.error('采摘草药失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
