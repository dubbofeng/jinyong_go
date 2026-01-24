import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { quests } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/quests/[questId] - 获取单个任务
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ questId: string }> }
) {
  try {
    const { questId } = await params;

    // 检查是否为数字ID或字符串questId
    const isNumericId = /^\d+$/.test(questId);
    
    const [quest] = isNumericId
      ? await db.select().from(quests).where(eq(quests.id, parseInt(questId)))
      : await db.select().from(quests).where(eq(quests.questId, questId));

    if (!quest) {
      return NextResponse.json(
        { success: false, error: 'Quest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: quest,
    });
  } catch (error) {
    console.error('Error fetching quest:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quest' },
      { status: 500 }
    );
  }
}

// PUT /api/quests/[questId] - 更新任务
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ questId: string }> }
) {
  try {
    const { questId } = await params;
    const body = await request.json();

    // 检查是否为数字ID或字符串questId
    const isNumericId = /^\d+$/.test(questId);
    
    const updateData: any = {};
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.questType !== undefined) updateData.questType = body.questType;
    if (body.chapter !== undefined) updateData.chapter = body.chapter;
    if (body.requirements !== undefined) updateData.requirements = body.requirements;
    if (body.rewards !== undefined) updateData.rewards = body.rewards;
    if (body.prerequisiteQuests !== undefined) updateData.prerequisiteQuests = body.prerequisiteQuests;

    updateData.updatedAt = new Date();

    const [updatedQuest] = isNumericId
      ? await db.update(quests).set(updateData).where(eq(quests.id, parseInt(questId))).returning()
      : await db.update(quests).set(updateData).where(eq(quests.questId, questId)).returning();

    if (!updatedQuest) {
      return NextResponse.json(
        { success: false, error: 'Quest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedQuest,
    });
  } catch (error) {
    console.error('Error updating quest:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update quest' },
      { status: 500 }
    );
  }
}

// DELETE /api/quests/[questId] - 删除任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ questId: string }> }
) {
  try {
    const { questId } = await params;

    // 检查是否为数字ID或字符串questId
    const isNumericId = /^\d+$/.test(questId);
    
    const [deletedQuest] = isNumericId
      ? await db.delete(quests).where(eq(quests.id, parseInt(questId))).returning()
      : await db.delete(quests).where(eq(quests.questId, questId)).returning();

    if (!deletedQuest) {
      return NextResponse.json(
        { success: false, error: 'Quest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deletedQuest,
    });
  } catch (error) {
    console.error('Error deleting quest:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete quest' },
      { status: 500 }
    );
  }
}
