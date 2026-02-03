/**
 * 玩家背包 API
 * POST /api/player/inventory/add - 添加物品到背包
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '../../../../../src/db';
import { playerInventory, questProgress } from '../../../../../src/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { autoCompleteQuests } from '@/src/lib/quest-engine';

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

    // 更新 collect_item 任务进度并自动完成
    if (applied.length > 0) {
      const activeQuestProgress = await db
        .select()
        .from(questProgress)
        .where(
          and(
            eq(questProgress.userId, userId),
            eq(questProgress.status, 'in_progress')
          )
        );
      
      for (const progress of activeQuestProgress) {
        const progressData = (progress.progress as Record<string, any>) || {};
        let updated = false;
        
        for (const item of applied) {
          const key = `collected_${item.itemId}`;
          progressData[key] = (progressData[key] || 0) + item.quantity;
          updated = true;
        }
        
        if (updated) {
          await db
            .update(questProgress)
            .set({
              progress: progressData,
              updatedAt: new Date(),
            })
            .where(eq(questProgress.id, progress.id));
        }
      }
      
      // 自动完成相关任务
      await autoCompleteQuests(userId, { itemId: applied[0].itemId });
    }

    return NextResponse.json({ success: true, data: applied });
  } catch (error) {
    console.error('添加背包物品失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
