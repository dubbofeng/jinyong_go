import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { db } from '@/app/db';
import { storyProgress } from '@/src/db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * GET /api/stories/progress?storyId=xxx
 * 获取指定故事进度
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    if (!storyId) {
      return NextResponse.json({ success: false, error: 'Missing storyId' }, { status: 400 });
    }

    const userId = parseInt(session.user.id);
    const [progress] = await db
      .select()
      .from(storyProgress)
      .where(and(eq(storyProgress.userId, userId), eq(storyProgress.storyId, storyId)))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: progress || null,
    });
  } catch (error) {
    console.error('Error fetching story progress:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch story progress' }, { status: 500 });
  }
}

/**
 * POST /api/stories/progress
 * Body: { storyId, sceneId, lineIndex, backgroundId, completed, choiceId }
 * 更新/创建故事进度
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { storyId, sceneId, lineIndex, backgroundId, completed = false, choiceId } = body || {};

    if (!storyId) {
      return NextResponse.json({ success: false, error: 'Missing storyId' }, { status: 400 });
    }

    const now = new Date();

    const [existing] = await db
      .select()
      .from(storyProgress)
      .where(and(eq(storyProgress.userId, userId), eq(storyProgress.storyId, storyId)))
      .limit(1);

    const payload = {
      sceneId: sceneId || null,
      lineIndex: typeof lineIndex === 'number' ? lineIndex : 0,
      backgroundId: backgroundId || null,
      completed: Boolean(completed),
      choiceId: choiceId || null,
      updatedAt: now,
    };

    const [updated] = existing
      ? await db
          .update(storyProgress)
          .set(payload)
          .where(and(eq(storyProgress.userId, userId), eq(storyProgress.storyId, storyId)))
          .returning()
      : await db
          .insert(storyProgress)
          .values({
            userId,
            storyId,
            ...payload,
            createdAt: now,
          })
          .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error saving story progress:', error);
    return NextResponse.json({ success: false, error: 'Failed to save story progress' }, { status: 500 });
  }
}
