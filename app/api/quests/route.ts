import { NextRequest, NextResponse } from 'next/server';
import { getAllQuests, getQuestsByChapter, getQuestsByType } from '@/src/lib/quest-manager';

// GET /api/quests - 获取所有任务
// GET /api/quests?chapter=1 - 获取指定章节的任务
// GET /api/quests?type=main - 获取指定类型的任务
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chapter = searchParams.get('chapter');
    const questType = searchParams.get('type');
    const locale = searchParams.get('locale') || 'zh';

    let quests;

    // 根据过滤器获取任务
    if (chapter) {
      quests = getQuestsByChapter(parseInt(chapter));
    } else if (questType) {
      quests = getQuestsByType(questType as 'main' | 'side' | 'tutorial');
    } else {
      const allQuestsMap = getAllQuests();
      quests = Object.values(allQuestsMap);
    }

    // 转换为数组格式（如果需要）
    const questArray = Array.isArray(quests) ? quests : Object.values(quests);

    return NextResponse.json({
      success: true,
      data: questArray,
      count: questArray.length,
    });
  } catch (error) {
    console.error('Error fetching quests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quests' },
      { status: 500 }
    );
  }
}

/**
 * 使用示例：
 * 
 * // 获取第一章的所有任务
 * fetch('/api/quests?chapter=1')
 * 
 * // 获取所有主线任务
 * fetch('/api/quests?type=main')
 * 
 * // 获取特定任务
 * fetch('/api/quests/first_battle')
 */
