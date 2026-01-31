import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '@/src/db';
import { gameProgress } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const body = await request.json();
    const add = Array.isArray(body?.add) ? body.add.filter(Boolean) : [];

    if (add.length === 0) {
      return NextResponse.json({ success: true, data: { completedTasks: [] } });
    }

    const [progress] = await db
      .select({ completedTasks: gameProgress.completedTasks })
      .from(gameProgress)
      .where(eq(gameProgress.userId, userId));

    if (!progress) {
      return NextResponse.json({ error: '玩家进度不存在' }, { status: 404 });
    }

    const current = (progress.completedTasks as string[]) || [];
    const next = Array.from(new Set([...current, ...add]));

    await db
      .update(gameProgress)
      .set({ completedTasks: next, updatedAt: new Date() })
      .where(eq(gameProgress.userId, userId));

    return NextResponse.json({ success: true, data: { completedTasks: next } });
  } catch (error) {
    console.error('更新练习进度失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
