import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { db } from '@/app/db';
import { npcs, npcRelationships, playerStats } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/npcs/[npcId]/battle-result
 * 记录与NPC的对战结果，更新关系和统计数据
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
    const { playerWon, experienceGained = 0, skillsUsed = [] } = await request.json();

    if (playerWon === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing playerWon field' },
        { status: 400 }
      );
    }

    // 验证NPC存在
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

    // 获取或创建NPC关系
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
      // 创建新的关系记录
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

    // 更新战斗统计
    let updates: any = {
      lastInteractionAt: new Date(),
      updatedAt: new Date(),
    };

    if (playerWon) {
      // 玩家胜利
      updates.battlesWon = (relationship.battlesWon || 0) + 1;
      updates.defeated = true; // 标记为已击败
      
      // 增加好感度（胜利后增加更多）
      const newAffection = Math.min(100, (relationship.affection || 0) + 10);
      updates.affection = newAffection;
      
      // 更新好感等级
      if (newAffection >= 80) {
        updates.affectionLevel = 'master';
      } else if (newAffection >= 60) {
        updates.affectionLevel = 'close_friend';
      } else if (newAffection >= 40) {
        updates.affectionLevel = 'friend';
      } else if (newAffection >= 20) {
        updates.affectionLevel = 'acquaintance';
      }
    } else {
      // 玩家失败
      updates.battlesLost = (relationship.battlesLost || 0) + 1;
      
      // 失败后好感度下降较少
      updates.affection = Math.max(0, (relationship.affection || 0) - 2);
    }

    // 执行更新
    await db
      .update(npcRelationships)
      .set(updates)
      .where(
        and(
          eq(npcRelationships.userId, userId),
          eq(npcRelationships.npcId, npcId)
        )
      );

    // 更新玩家经验值
    if (experienceGained > 0) {
      const [currentStats] = await db
        .select()
        .from(playerStats)
        .where(eq(playerStats.userId, userId))
        .limit(1);
      
      if (currentStats) {
        await db
          .update(playerStats)
          .set({
            experience: (currentStats.experience || 0) + experienceGained,
            updatedAt: new Date(),
          })
          .where(eq(playerStats.userId, userId));
      }
    }

    // 获取更新后的关系信息
    const [updatedRelationship] = await db
      .select()
      .from(npcRelationships)
      .where(
        and(
          eq(npcRelationships.userId, userId),
          eq(npcRelationships.npcId, npcId)
        )
      )
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        relationship: {
          affection: updatedRelationship.affection,
          affectionLevel: updatedRelationship.affectionLevel,
          defeated: updatedRelationship.defeated,
          battlesWon: updatedRelationship.battlesWon,
          battlesLost: updatedRelationship.battlesLost,
        },
        experienceGained,
      },
    });
  } catch (error) {
    console.error('Error saving battle result:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save battle result' },
      { status: 500 }
    );
  }
}
