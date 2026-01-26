/**
 * 解锁技能 API
 * POST /api/player/skills/unlock - 解锁新技能
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '../../../../../src/db';
import { playerSkills } from '../../../../../src/db/schema';
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
    const { skillId, questId } = body;

    if (!skillId) {
      return NextResponse.json(
        { error: '参数错误' },
        { status: 400 }
      );
    }

    // 检查是否已解锁
    const existing = await db
      .select()
      .from(playerSkills)
      .where(
        and(
          eq(playerSkills.userId, userId),
          eq(playerSkills.skillId, skillId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].unlocked) {
        return NextResponse.json(
          { error: '技能已解锁' },
          { status: 400 }
        );
      }

      // 更新为已解锁
      const updated = await db
        .update(playerSkills)
        .set({
          unlocked: true,
          unlockedAt: new Date(),
          unlockedByQuest: questId,
          updatedAt: new Date(),
        })
        .where(eq(playerSkills.id, existing[0].id))
        .returning();

      return NextResponse.json({
        success: true,
        data: updated[0],
        message: '技能解锁成功',
      });
    }

    // 创建新技能记录
    const newSkill = await db
      .insert(playerSkills)
      .values({
        userId,
        skillId,
        unlocked: true,
        level: 1,
        experience: 0,
        unlockedByQuest: questId,
        unlockedAt: new Date(),
        timesUsed: 0,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newSkill[0],
      message: '技能解锁成功',
    });
  } catch (error) {
    console.error('解锁技能失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
