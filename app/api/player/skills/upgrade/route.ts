/**
 * 玩家技能升级 API
 * POST /api/player/skills/upgrade - 使用技能点升级技能
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '../../../../../src/db';
import { playerSkills, gameProgress } from '../../../../../src/db/schema';
import { eq, and } from 'drizzle-orm';

const MAX_SKILL_LEVEL = 9; // 技能最高9级

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
    const { skillId } = body;

    if (!skillId) {
      return NextResponse.json(
        { error: '缺少技能ID' },
        { status: 400 }
      );
    }

    // 获取玩家游戏进度（技能点）
    const progress = await db.query.gameProgress.findFirst({
      where: eq(gameProgress.userId, userId)
    });

    if (!progress) {
      return NextResponse.json(
        { error: '未找到游戏进度' },
        { status: 404 }
      );
    }

    // 检查技能点是否足够
    if (progress.skillPoints < 1) {
      return NextResponse.json(
        { 
          error: '技能点不足',
          current: progress.skillPoints
        },
        { status: 400 }
      );
    }

    // 获取玩家技能
    const skill = await db.query.playerSkills.findFirst({
      where: and(
        eq(playerSkills.userId, userId),
        eq(playerSkills.skillId, skillId)
      )
    });

    if (!skill) {
      return NextResponse.json(
        { error: '技能未解锁' },
        { status: 404 }
      );
    }

    if (!skill.unlocked) {
      return NextResponse.json(
        { error: '技能未解锁' },
        { status: 403 }
      );
    }

    // 检查是否已满级
    if (skill.level >= MAX_SKILL_LEVEL) {
      return NextResponse.json(
        { error: '技能已达到最高等级' },
        { status: 400 }
      );
    }

    // 升级：等级+1，扣除1技能点
    const newLevel = skill.level + 1;

    await db
      .update(playerSkills)
      .set({
        level: newLevel,
        updatedAt: new Date()
      })
      .where(and(
        eq(playerSkills.userId, userId),
        eq(playerSkills.skillId, skillId)
      ));

    // 扣除技能点
    await db
      .update(gameProgress)
      .set({
        skillPoints: progress.skillPoints - 1,
        updatedAt: new Date()
      })
      .where(eq(gameProgress.userId, userId));

    return NextResponse.json({
      success: true,
      data: {
        skillId,
        oldLevel: skill.level,
        newLevel,
        remainingSkillPoints: progress.skillPoints - 1,
        message: `技能升级成功！${skill.level} → ${newLevel}`
      }
    });
  } catch (error) {
    console.error('技能升级失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
