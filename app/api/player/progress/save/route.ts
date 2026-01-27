/**
 * 游戏进度保存API
 * 支持自动保存和手动保存
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { gameProgress } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/player/progress/save
 * Body: {
 *   userId: number,
 *   currentMap?: string,
 *   currentX?: number,
 *   currentY?: number,
 *   activeQuests?: string[],
 *   completedQuests?: string[],
 *   unlockedSkills?: string[],
 *   skillLevels?: Record<string, number>,
 *   totalGames?: number,
 *   wins?: number,
 *   losses?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      currentMap,
      currentX,
      currentY,
      activeQuests,
      completedQuests,
      unlockedSkills,
      skillLevels,
      totalGames,
      wins,
      losses
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户ID' },
        { status: 400 }
      );
    }

    // 检查玩家进度是否存在
    const [existingProgress] = await db
      .select()
      .from(gameProgress)
      .where(eq(gameProgress.userId, userId));

    if (!existingProgress) {
      return NextResponse.json(
        { error: '玩家进度不存在' },
        { status: 404 }
      );
    }

    // 构建更新数据（只更新提供的字段）
    const updateData: any = {
      updatedAt: new Date(),
      lastSavedAt: new Date(),
    };

    if (currentMap !== undefined) updateData.currentMap = currentMap;
    if (currentX !== undefined) updateData.currentX = currentX;
    if (currentY !== undefined) updateData.currentY = currentY;
    if (activeQuests !== undefined) updateData.activeQuests = activeQuests;
    if (completedQuests !== undefined) updateData.completedQuests = completedQuests;
    if (unlockedSkills !== undefined) updateData.unlockedSkills = unlockedSkills;
    if (skillLevels !== undefined) updateData.skillLevels = skillLevels;
    if (totalGames !== undefined) updateData.totalGames = totalGames;
    if (wins !== undefined) updateData.wins = wins;
    if (losses !== undefined) updateData.losses = losses;

    // 更新进度
    await db
      .update(gameProgress)
      .set(updateData)
      .where(eq(gameProgress.userId, userId));

    return NextResponse.json({
      success: true,
      message: '游戏进度已保存',
      savedAt: updateData.lastSavedAt,
    });

  } catch (error) {
    console.error('Error saving game progress:', error);
    return NextResponse.json(
      { error: '保存进度失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/player/progress/load?userId=123
 * 加载玩家进度
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');

    if (!userIdParam) {
      return NextResponse.json(
        { error: '缺少用户ID' },
        { status: 400 }
      );
    }

    const userId = parseInt(userIdParam);

    // 获取玩家进度
    const [progress] = await db
      .select()
      .from(gameProgress)
      .where(eq(gameProgress.userId, userId));

    if (!progress) {
      return NextResponse.json(
        { error: '玩家进度不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      progress: {
        playerName: progress.playerName,
        level: progress.level,
        experience: progress.experience,
        currentMap: progress.currentMap,
        currentX: progress.currentX,
        currentY: progress.currentY,
        currentChapter: progress.currentChapter,
        activeQuests: progress.activeQuests,
        completedQuests: progress.completedQuests,
        unlockedSkills: progress.unlockedSkills,
        skillLevels: progress.skillLevels,
        totalGames: progress.totalGames,
        wins: progress.wins,
        losses: progress.losses,
        lastSavedAt: progress.lastSavedAt,
      },
    });

  } catch (error) {
    console.error('Error loading game progress:', error);
    return NextResponse.json(
      { error: '加载进度失败' },
      { status: 500 }
    );
  }
}
