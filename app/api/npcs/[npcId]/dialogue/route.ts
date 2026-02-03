import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { db } from '@/app/db';
import { npcs, npcRelationships, questProgress } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { autoCompleteQuests } from '@/src/lib/quest-engine';

/**
 * POST /api/npcs/[npcId]/dialogue
 * 记录与NPC的对话交互次数，用于首次对话判断
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ npcId: string }> }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const { flags = [], flag, increment = true } = body || {};

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const { npcId } = await params;

    const [npc] = await db
      .select()
      .from(npcs)
      .where(eq(npcs.npcId, npcId))
      .limit(1);

    if (!npc) {
      return NextResponse.json(
        { success: false, error: 'NPC not found' },
        { status: 404 }
      );
    }

    let [relationship] = await db
      .select()
      .from(npcRelationships)
      .where(
        and(
          eq(npcRelationships.userId, userId),
          eq(npcRelationships.npcId, npcId)
        )
      )
      .limit(1);

    if (!relationship) {
      const [newRelationship] = await db
        .insert(npcRelationships)
        .values({
          userId,
          npcId,
          affection: 0,
          affectionLevel: 'stranger',
          dialoguesCount: 0,
          dialogueFlags: [],
          battlesWon: 0,
          battlesLost: 0,
          defeated: false,
          learnedFrom: false,
        })
        .returning();

      relationship = newRelationship;
    }

    const currentFlags = (relationship.dialogueFlags || []) as string[];
    const incomingFlags = [
      ...flags,
      ...(flag ? [flag] : []),
    ].filter(Boolean) as string[];
    const nextFlags = Array.from(new Set([...currentFlags, ...incomingFlags]));

    const wasFirstTime = (relationship.dialoguesCount || 0) === 0;
    const nextCount = increment ? (relationship.dialoguesCount || 0) + 1 : (relationship.dialoguesCount || 0);

    await db
      .update(npcRelationships)
      .set({
        dialoguesCount: nextCount,
        dialogueFlags: nextFlags,
        lastInteractionAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(npcRelationships.userId, userId),
          eq(npcRelationships.npcId, npcId)
        )
      );

    // 更新 meet_npc 进度（首次见面）
    if (wasFirstTime) {
      const activeQuestProgress = await db
        .select()
        .from(questProgress)
        .where(
          and(
            eq(questProgress.userId, userId),
            eq(questProgress.status, 'in_progress')
          )
        );
      
      for (const progress of activeQuestProgress) {
        const progressData = (progress.progress as Record<string, any>) || {};
        progressData[`met_${npcId}`] = true;
        
        await db
          .update(questProgress)
          .set({
            progress: progressData,
            updatedAt: new Date(),
          })
          .where(eq(questProgress.id, progress.id));
      }
    }
    
    // 自动完成相关任务
    const completedQuests = await autoCompleteQuests(userId, { npcId });

    return NextResponse.json({
      success: true,
      data: {
        npcId,
        dialoguesCount: nextCount,
        dialogueFlags: nextFlags,
        isFirstTime: wasFirstTime,
        completedQuests, // 返回自动完成的任务列表
      },
    });
  } catch (error) {
    console.error('Error recording NPC dialogue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record NPC dialogue' },
      { status: 500 }
    );
  }
}