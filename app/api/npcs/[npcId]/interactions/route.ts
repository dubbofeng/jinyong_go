import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { db } from '@/app/db';
import { npcs, npcRelationships } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { loadPlayerContext, checkRequirement } from '@/src/lib/requirement-checker';
import type { Requirement, DialogueRequirement, BattleRequirement } from '@/src/types/requirements';

/**
 * GET /api/npcs/[npcId]/interactions
 * 获取NPC可用的对话和战斗选项（带条件检查）
 */
export async function GET(
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

    // 获取NPC信息
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

    // 加载玩家上下文
    const playerContext = await loadPlayerContext(userId);

    // 获取NPC关系
    const [relationship] = await db
      .select()
      .from(npcRelationships)
      .where(
        and(
          eq(npcRelationships.userId, userId),
          eq(npcRelationships.npcId, npcId)
        )
      )
      .limit(1);

    // 解析NPC的requirements配置
    const npcRequirements = (npc.requirements || {}) as {
      dialogues?: Record<string, DialogueRequirement>;
      battle?: BattleRequirement;
    };

    // 检查对话选项
    const dialogues = npc.dialogues || {};
    const dialogueResults: Record<string, {
      unlocked: boolean;
      enabled: boolean;
      reason?: string;
      hint?: string;
    }> = {};

    for (const [dialogueKey, dialogueData] of Object.entries(dialogues)) {
      const dialogueReq = npcRequirements.dialogues?.[dialogueKey];
      
      if (!dialogueReq) {
        // 没有条件限制，默认解锁和可用
        dialogueResults[dialogueKey] = {
          unlocked: true,
          enabled: true,
        };
        continue;
      }

      // 检查解锁条件
      let unlocked = true;
      let unlockedReason: string | undefined;
      
      if (dialogueReq.unlockConditions && dialogueReq.unlockConditions.length > 0) {
        for (const condition of dialogueReq.unlockConditions) {
          // 为首次交互条件补充npcId
          const conditionWithNpcId = condition.type === 'first_time' 
            ? { ...condition, npcId } 
            : condition;
          
          const result = checkRequirement(conditionWithNpcId, playerContext);
          if (!result.satisfied) {
            unlocked = false;
            unlockedReason = result.reason;
            break;
          }
        }
      }

      // 检查启用条件
      let enabled = true;
      let enabledReason: string | undefined;
      
      if (unlocked && dialogueReq.enableConditions && dialogueReq.enableConditions.length > 0) {
        for (const condition of dialogueReq.enableConditions) {
          const conditionWithNpcId = condition.type === 'first_time' 
            ? { ...condition, npcId } 
            : condition;
          
          const result = checkRequirement(conditionWithNpcId, playerContext);
          if (!result.satisfied) {
            enabled = false;
            enabledReason = result.reason;
            break;
          }
        }
      }

      dialogueResults[dialogueKey] = {
        unlocked,
        enabled: unlocked && enabled,
        reason: !unlocked ? unlockedReason : !enabled ? enabledReason : undefined,
        hint: !unlocked ? dialogueReq.lockedHint : undefined,
      };
    }

    // 检查战斗可用性
    let battleAvailable = false;
    let battleReason: string | undefined;
    let battleRepeatable = false;
    let battleCooldown: number | undefined;

    if (npc.npcType === 'opponent' && npcRequirements.battle) {
      const battleReq = npcRequirements.battle;
      battleRepeatable = battleReq.repeatable || false;

      // 检查解锁条件
      let battleUnlocked = true;
      if (battleReq.unlockConditions && battleReq.unlockConditions.length > 0) {
        for (const condition of battleReq.unlockConditions) {
          const result = checkRequirement(condition, playerContext);
          if (!result.satisfied) {
            battleUnlocked = false;
            battleReason = result.reason || battleReq.lockedHint;
            break;
          }
        }
      }

      if (battleUnlocked) {
        // 如果已经击败过，检查是否可重复
        if (relationship?.defeated) {
          if (battleRepeatable) {
            // 检查重复条件
            if (battleReq.repeatConditions && battleReq.repeatConditions.length > 0) {
              for (const condition of battleReq.repeatConditions) {
                const result = checkRequirement(condition, playerContext);
                if (!result.satisfied) {
                  battleAvailable = false;
                  battleReason = result.reason;
                  break;
                } else {
                  battleAvailable = true;
                }
              }
            } else {
              battleAvailable = true;
            }

            // TODO: 检查冷却时间
            if (battleReq.cooldownSeconds && relationship.lastInteractionAt) {
              const now = new Date();
              const lastInteraction = new Date(relationship.lastInteractionAt);
              const secondsSince = (now.getTime() - lastInteraction.getTime()) / 1000;
              
              if (secondsSince < battleReq.cooldownSeconds) {
                battleAvailable = false;
                const remainingSeconds = Math.ceil(battleReq.cooldownSeconds - secondsSince);
                battleCooldown = remainingSeconds;
                battleReason = `冷却中，${Math.floor(remainingSeconds / 60)}分钟后可再次挑战`;
              }
            }
          } else {
            battleAvailable = false;
            battleReason = '已击败，不可重复挑战';
          }
        } else {
          // 未击败过，可以挑战
          battleAvailable = true;
        }
      }
    } else if (npc.npcType === 'opponent') {
      // 没有配置battle requirements，默认可以挑战
      battleAvailable = !relationship?.defeated;
      if (relationship?.defeated) {
        battleReason = '已击败';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        npcId: npc.npcId,
        npcType: npc.npcType,
        relationship: relationship
          ? {
              affection: relationship.affection,
              affectionLevel: relationship.affectionLevel,
              defeated: relationship.defeated,
              learnedFrom: relationship.learnedFrom,
              dialoguesCount: relationship.dialoguesCount,
              battlesWon: relationship.battlesWon,
              battlesLost: relationship.battlesLost,
            }
          : null,
        dialogues: dialogueResults,
        battle: npc.npcType === 'opponent'
          ? {
              available: battleAvailable,
              repeatable: battleRepeatable,
              reason: battleReason,
              cooldownSeconds: battleCooldown,
            }
          : undefined,
      },
    });
  } catch (error) {
    console.error('Error checking NPC interactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check interactions' },
      { status: 500 }
    );
  }
}
