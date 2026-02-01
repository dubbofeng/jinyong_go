import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '@/src/db';
import { items, mapItems, playerInventory } from '@/src/db/schema';
import { and, eq, sql } from 'drizzle-orm';

const chestOpenMap: Record<string, string> = {
  chest01: '/game/isometric/items/chest05.png',
  chest02: '/game/isometric/items/chest06.png',
};

export async function POST(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const itemInstanceId = Number(params.itemId);
    if (!itemInstanceId) {
      return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
    }

    const [entry] = await db
      .select({
        id: mapItems.id,
        collected: mapItems.collected,
        metadata: mapItems.metadata,
        itemId: items.itemId,
      })
      .from(mapItems)
      .leftJoin(items, eq(mapItems.itemId, items.id))
      .where(eq(mapItems.id, itemInstanceId));

    if (!entry || !entry.itemId) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const chestOpenPath = chestOpenMap[entry.itemId];
    if (!chestOpenPath) {
      return NextResponse.json({ error: 'Item is not a chest' }, { status: 400 });
    }

    const state = entry.metadata?.state || (entry.collected ? 'opened' : 'closed');
    if (state === 'opened' || entry.collected) {
      return NextResponse.json({
        success: true,
        data: {
          itemId: entry.itemId,
          state: 'opened',
          imagePath: chestOpenPath,
          alreadyOpened: true,
        },
      });
    }

    const [reward] = await db
      .select({ itemId: items.itemId, name: items.name })
      .from(items)
      .where(sql`${items.itemType} in ('consumable','material','equipment')`)
      .orderBy(sql`RANDOM()`)
      .limit(1);

    if (reward?.itemId) {
      const existing = await db
        .select({ id: playerInventory.id })
        .from(playerInventory)
        .where(and(eq(playerInventory.userId, Number(session.user.id)), eq(playerInventory.itemId, reward.itemId)));

      if (existing.length > 0) {
        await db
          .update(playerInventory)
          .set({
            quantity: sql`${playerInventory.quantity} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(playerInventory.id, existing[0].id));
      } else {
        await db.insert(playerInventory).values({
          userId: Number(session.user.id),
          itemId: reward.itemId,
          quantity: 1,
        });
      }
    }

    await db
      .update(mapItems)
      .set({
        collected: true,
        metadata: {
          ...(entry.metadata || {}),
          state: 'opened',
          openedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(mapItems.id, itemInstanceId));

    return NextResponse.json({
      success: true,
      data: {
        itemId: entry.itemId,
        state: 'opened',
        imagePath: chestOpenPath,
        reward: reward?.itemId
          ? { itemId: reward.itemId, name: reward.name }
          : null,
      },
    });
  } catch (error) {
    console.error('Open chest failed:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
