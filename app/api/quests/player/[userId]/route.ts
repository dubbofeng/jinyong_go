import { NextRequest, NextResponse } from 'next/server';
import {
  getAvailableQuests,
  getActiveQuests,
  startQuest,
  completeQuest,
} from '@/src/lib/quest-engine';
import { auth } from '@/app/auth';

// GET /api/quests/player/[userId] - 获取玩家任务信息
// GET /api/quests/player/[userId]?type=available - 获取可用任务
// GET /api/quests/player/[userId]?type=active - 获取进行中的任务
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'available' | 'active'

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // 验证用户权限（只能查看自己的任务）
    if (session?.user?.id && parseInt(session.user.id) !== userIdNum) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (type === 'active') {
      const activeQuests = await getActiveQuests(userIdNum);
      return NextResponse.json({
        success: true,
        data: activeQuests,
        count: activeQuests.length,
      });
    }

    // Default: return available quests
    const availableQuests = await getAvailableQuests(userIdNum);
    return NextResponse.json({
      success: true,
      data: availableQuests,
      count: availableQuests.length,
    });
  } catch (error) {
    console.error('Error fetching player quests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quests' },
      { status: 500 }
    );
  }
}

// POST /api/quests/player/[userId] - 开始或完成任务
// Body: { questId: string, action: 'start' | 'complete' }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = await params;
    const body = await request.json();
    const { questId, action } = body;

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // 验证用户权限（只能操作自己的任务）
    if (parseInt(session.user.id) !== userIdNum) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (!questId) {
      return NextResponse.json(
        { success: false, error: 'Quest ID required' },
        { status: 400 }
      );
    }

    if (action === 'start') {
      const result = await startQuest(userIdNum, questId);
      return NextResponse.json(result, {
        status: result.success ? 200 : 400,
      });
    }

    if (action === 'complete') {
      const result = await completeQuest(userIdNum, questId);
      return NextResponse.json(result, {
        status: result.success ? 200 : 400,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "start" or "complete"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error handling quest action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to handle quest action' },
      { status: 500 }
    );
  }
}
