import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { db } from '@/app/db';
import { npcs, npcRelationships } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/npcs/[npcId]/dialogue
 * 记录与NPC的对话交互次数，用于首次对话判断
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ npcId: string }> }
) {
  try {
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
          battlesWon: 0,
          battlesLost: 0,
          defeated: false,
          learnedFrom: false,
        })
        .returning();

      relationship = newRelationship;
    }

    const wasFirstTime = (relationship.dialoguesCount || 0) === 0;
    const nextCount = (relationship.dialoguesCount || 0) + 1;

    await db
      .update(npcRelationships)
      .set({
        dialoguesCount: nextCount,
        lastInteractionAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(npcRelationships.userId, userId),
          eq(npcRelationships.npcId, npcId)
        )
      );

    return NextResponse.json({
      success: true,
      data: {
        npcId,
        dialoguesCount: nextCount,
        isFirstTime: wasFirstTime,
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