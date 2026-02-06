import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { questProgress } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { getQuestById, mergeQuestWithProgress } from '@/src/lib/quest-manager';
import { auth } from '@/app/auth';

// GET /api/quests/[questId] - 获取单个任务（包含用户进度，如果已登录）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ questId: string }> }
) {
  try {
    const { questId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'zh';

    // 从JSON获取quest定义
    const questDefinition = getQuestById(questId);

    if (!questDefinition) {
      return NextResponse.json({ success: false, error: 'Quest not found' }, { status: 404 });
    }

    // 尝试获取用户session，如果有则加载进度
    const session = await auth();
    let quest;

    if (session?.user?.id) {
      // 从数据库获取用户的quest进度
      const [progressData] = await db
        .select()
        .from(questProgress)
        .where(
          and(
            eq(questProgress.userId, parseInt(session.user.id)),
            eq(questProgress.questId, questId)
          )
        )
        .limit(1);

      // 合并定义和进度
      quest = mergeQuestWithProgress(questDefinition, progressData as any);
    } else {
      // 未登录，只返回定义
      quest = mergeQuestWithProgress(questDefinition);
    }

    return NextResponse.json({
      success: true,
      data: quest,
    });
  } catch (error) {
    console.error('Error fetching quest:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch quest' }, { status: 500 });
  }
}

// PATCH /api/quests/[questId] - 更新任务进度（仅限已登录用户）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ questId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { questId } = await params;
    const body = await request.json();

    // 验证quest定义存在
    const questDefinition = getQuestById(questId);
    if (!questDefinition) {
      return NextResponse.json({ success: false, error: 'Quest not found' }, { status: 404 });
    }

    const userId = parseInt(session.user.id);

    // 检查是否已有进度记录
    const [existing] = await db
      .select()
      .from(questProgress)
      .where(and(eq(questProgress.userId, userId), eq(questProgress.questId, questId)))
      .limit(1);

    let result;

    if (existing) {
      // 更新现有记录
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (body.status !== undefined) updateData.status = body.status;
      if (body.progress !== undefined) updateData.progress = body.progress;
      if (body.currentStep !== undefined) updateData.currentStep = body.currentStep;
      if (body.totalSteps !== undefined) updateData.totalSteps = body.totalSteps;

      if (body.status === 'in_progress' && !existing.startedAt) {
        updateData.startedAt = new Date();
      }
      if (body.status === 'completed') {
        updateData.completedAt = new Date();
      }

      [result] = await db
        .update(questProgress)
        .set(updateData)
        .where(eq(questProgress.id, existing.id))
        .returning();
    } else {
      // 创建新记录
      [result] = await db
        .insert(questProgress)
        .values({
          userId,
          questId,
          status: body.status || 'in_progress',
          progress: body.progress || {},
          currentStep: body.currentStep || 0,
          totalSteps: body.totalSteps || questDefinition.objectives.length,
          startedAt: new Date(),
        })
        .returning();
    }

    // 合并并返回完整quest
    const quest = mergeQuestWithProgress(questDefinition, result as any);

    return NextResponse.json({
      success: true,
      data: quest,
    });
  } catch (error) {
    console.error('Error updating quest progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update quest progress' },
      { status: 500 }
    );
  }
}
