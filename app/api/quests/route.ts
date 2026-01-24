import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { quests } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET /api/quests - 获取所有任务
// GET /api/quests?chapter=1 - 获取指定章节的任务
// GET /api/quests?type=main - 获取指定类型的任务
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chapter = searchParams.get('chapter');
    const questType = searchParams.get('type');

    let allQuests = await db.select().from(quests).orderBy(desc(quests.chapter), desc(quests.createdAt));

    // 应用过滤器
    if (chapter) {
      allQuests = allQuests.filter(q => q.chapter === parseInt(chapter));
    }
    if (questType) {
      allQuests = allQuests.filter(q => q.questType === questType);
    }

    return NextResponse.json({
      success: true,
      data: allQuests,
      count: allQuests.length,
    });
  } catch (error) {
    console.error('Error fetching quests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quests' },
      { status: 500 }
    );
  }
}

// POST /api/quests - 创建新任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      questId,
      title,
      description,
      questType,
      chapter,
      requirements,
      rewards,
      prerequisiteQuests,
    } = body;

    // 验证必填字段
    if (!questId || !title || !description || !questType || !chapter || !requirements || !rewards) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 插入新任务
    const [newQuest] = await db
      .insert(quests)
      .values({
        questId,
        title,
        description,
        questType,
        chapter,
        requirements,
        rewards,
        prerequisiteQuests: prerequisiteQuests || [],
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newQuest,
    });
  } catch (error) {
    console.error('Error creating quest:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create quest' },
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
