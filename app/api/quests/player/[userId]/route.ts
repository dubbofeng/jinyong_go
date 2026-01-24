import { NextRequest, NextResponse } from 'next/server';
import {
  getAvailableQuests,
  getActiveQuests,
  startQuest,
  completeQuest,
} from '@/src/lib/quest-engine';

// GET /api/quests/player/[userId] - 获取玩家任务信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
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

    if (type === 'active') {
      const activeQuests = await getActiveQuests(userIdNum);
      return NextResponse.json({
        success: true,
        data: activeQuests,
      });
    }

    // Default: return available quests
    const availableQuests = await getAvailableQuests(userIdNum);
    return NextResponse.json({
      success: true,
      data: availableQuests,
    });
  } catch (error) {
    console.error('Error fetching player quests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quests' },
      { status: 500 }
    );
  }
}

// POST /api/quests/player/[userId] - 开始任务
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
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

    if (!questId) {
      return NextResponse.json(
        { success: false, error: 'Quest ID required' },
        { status: 400 }
      );
    }

    if (action === 'start') {
      const result = await startQuest(userIdNum, questId);
      return NextResponse.json(result);
    }

    if (action === 'complete') {
      const result = await completeQuest(userIdNum, questId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
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
