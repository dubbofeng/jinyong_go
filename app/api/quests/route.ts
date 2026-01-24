/**
 * 任务系统 API 路由示例
 * GET /api/quests - 获取所有任务
 * GET /api/quests/[questId] - 获取单个任务
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadQuest, loadAllQuests } from '@/src/lib/data-loader';

// 获取所有任务
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chapter = searchParams.get('chapter');
    const questType = searchParams.get('type');

    // 加载所有任务（优先从数据库）
    let quests = await loadAllQuests();

    // 过滤
    if (chapter) {
      quests = quests.filter((q: any) => q.chapter === parseInt(chapter));
    }
    if (questType) {
      quests = quests.filter((q: any) => q.questType === questType);
    }

    return NextResponse.json(quests);
  } catch (error) {
    console.error('Error loading quests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
