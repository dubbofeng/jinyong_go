/**
 * 获取玩家技能点 API
 * GET /api/player/skill-points - 获取可用技能点
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { db } from '../../../../src/db';
import { gameProgress, playerStats } from '../../../../src/db/schema';
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

    // 获取玩家游戏进度
    const progress = await db.query.gameProgress.findFirst({
      where: eq(gameProgress.userId, userId)
    });

    if (!progress) {
      return NextResponse.json(
        { error: '未找到游戏进度' },
        { status: 404 }
      );
    }

    const stats = await db.query.playerStats.findFirst({
      where: eq(playerStats.userId, userId)
    });

    return NextResponse.json({
      success: true,
      data: {
        skillPoints: progress.skillPoints,
        level: stats?.level ?? 1,
        experience: stats?.experience ?? 0
      }
    });
  } catch (error) {
    console.error('获取技能点失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
