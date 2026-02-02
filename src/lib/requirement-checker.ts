import { db } from '@/app/db';
import { gameProgress, npcRelationships, playerSkills, playerStats } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Requirement, RequirementCheckResult } from '@/src/types/requirements';

/**
 * 玩家上下文信息（用于条件检查）
 */
export interface PlayerContext {
  userId: number;
  level?: number;
  chapter?: number;
  completedQuests?: string[];
  unlockedSkills?: string[];
  currentMap?: string;
  // 从数据库加载的完整信息
  gameProgress?: {
    chapter: number;
    completedQuests: string[];
    currentMap: string;
  };
  npcRelationships?: Map<string, {
    affection: number;
    affectionLevel: string;
    defeated: boolean;
    learnedFrom: boolean;
    dialoguesCount: number;
    battlesWon: number;
    battlesLost: number;
    firstMetAt: Date | null;
  }>;
  inventory?: Map<string, number>; // itemId -> count
}

/**
 * 加载玩家完整上下文信息
 */
export async function loadPlayerContext(userId: number): Promise<PlayerContext> {
  // 加载游戏进度
  const [progress] = await db
    .select()
    .from(gameProgress)
    .where(eq(gameProgress.userId, userId))
    .limit(1);

  // 加载玩家属性
  const [stats] = await db
    .select({ level: playerStats.level })
    .from(playerStats)
    .where(eq(playerStats.userId, userId))
    .limit(1);

  // 加载玩家技能（仅解锁）
  const unlockedSkillRows = await db
    .select({ skillId: playerSkills.skillId })
    .from(playerSkills)
    .where(and(eq(playerSkills.userId, userId), eq(playerSkills.unlocked, true)));

  // 加载NPC关系
  const relationships = await db
    .select()
    .from(npcRelationships)
    .where(eq(npcRelationships.userId, userId));

  const npcRelationshipsMap = new Map(
    relationships.map((rel) => [
      rel.npcId,
      {
        affection: rel.affection,
        affectionLevel: rel.affectionLevel,
        defeated: rel.defeated,
        learnedFrom: rel.learnedFrom,
        dialoguesCount: rel.dialoguesCount,
        battlesWon: rel.battlesWon,
        battlesLost: rel.battlesLost,
        firstMetAt: rel.firstMetAt,
      },
    ])
  );

  // TODO: 加载背包物品（当物品系统实现后）
  const inventory = new Map<string, number>();

  return {
    userId,
    level: stats?.level,
    chapter: progress?.chapter,
    completedQuests: progress?.completedQuests || [],
    unlockedSkills: unlockedSkillRows.map((row) => row.skillId),
    currentMap: progress?.currentMap || '',
    gameProgress: progress
      ? {
          chapter: progress.chapter,
          completedQuests: progress.completedQuests || [],
          currentMap: progress.currentMap || '',
        }
      : undefined,
    npcRelationships: npcRelationshipsMap,
    inventory,
  };
}

/**
 * 检查单个条件是否满足
 */
export function checkRequirement(
  requirement: Requirement,
  context: PlayerContext
): RequirementCheckResult {
  const { type } = requirement;

  switch (type) {
    case 'level':
      return checkLevelRequirement(requirement, context);
    
    case 'chapter':
      return checkChapterRequirement(requirement, context);
    
    case 'quest_completed':
      return checkQuestCompletedRequirement(requirement, context);
    
    case 'npc_defeated':
      return checkNpcDefeatedRequirement(requirement, context);
    
    case 'npc_not_defeated':
      return checkNpcNotDefeatedRequirement(requirement, context);
    
    case 'skill_unlocked':
      return checkSkillUnlockedRequirement(requirement, context);
    
    case 'skill_not_unlocked':
      return checkSkillNotUnlockedRequirement(requirement, context);
    
    case 'first_time':
      return checkFirstTimeRequirement(requirement, context);
    
    case 'affection_level':
      return checkAffectionLevelRequirement(requirement, context);
    
    case 'defeated_count':
      return checkDefeatedCountRequirement(requirement, context);
    
    case 'item_possessed':
      return checkItemPossessedRequirement(requirement, context);
    
    case 'and':
      return checkAndRequirement(requirement, context);
    
    case 'or':
      return checkOrRequirement(requirement, context);
    
    case 'not':
      return checkNotRequirement(requirement, context);
    
    default:
      return {
        satisfied: false,
        reason: `未知的条件类型: ${type}`,
      };
  }
}

/**
 * 检查多个条件（AND逻辑）
 */
export function checkRequirements(
  requirements: Requirement[],
  context: PlayerContext
): RequirementCheckResult {
  if (!requirements || requirements.length === 0) {
    return { satisfied: true };
  }

  const missingRequirements: Requirement[] = [];
  const reasons: string[] = [];

  for (const requirement of requirements) {
    const result = checkRequirement(requirement, context);
    if (!result.satisfied) {
      missingRequirements.push(requirement);
      if (result.reason) {
        reasons.push(result.reason);
      }
    }
  }

  if (missingRequirements.length === 0) {
    return { satisfied: true };
  }

  return {
    satisfied: false,
    reason: reasons.join('; '),
    missingRequirements,
  };
}

// ============ 具体条件检查函数 ============

function checkLevelRequirement(
  requirement: Requirement,
  context: PlayerContext
): RequirementCheckResult {
  const playerLevel = context.level || 1;
  
  if (requirement.minLevel && playerLevel < requirement.minLevel) {
    return {
      satisfied: false,
      reason: `需要等级${requirement.minLevel}（当前${playerLevel}级）`,
    };
  }
  
  if (requirement.maxLevel && playerLevel > requirement.maxLevel) {
    return {
      satisfied: false,
      reason: `等级不能超过${requirement.maxLevel}（当前${playerLevel}级）`,
    };
  }
  
  return { satisfied: true };
}

function checkChapterRequirement(
  requirement: Requirement,
  context: PlayerContext
): RequirementCheckResult {
  const playerChapter = context.chapter || context.gameProgress?.chapter || 0;
  
  if (requirement.chapter && playerChapter < requirement.chapter) {
    return {
      satisfied: false,
      reason: `需要达到第${requirement.chapter}章（当前第${playerChapter}章）`,
    };
  }
  
  return { satisfied: true };
}

function checkQuestCompletedRequirement(
  requirement: Requirement,
  context: PlayerContext
): RequirementCheckResult {
  if (!requirement.questId) {
    return { satisfied: false, reason: '缺少questId参数' };
  }
  
  const completedQuests = context.completedQuests || context.gameProgress?.completedQuests || [];
  const completed = completedQuests.includes(requirement.questId);
  
  if (!completed) {
    return {
      satisfied: false,
      reason: `需要完成任务：${requirement.questId}`,
    };
  }
  
  return { satisfied: true };
}

function checkNpcDefeatedRequirement(
  requirement: Requirement,
  context: PlayerContext
): RequirementCheckResult {
  if (!requirement.npcId) {
    return { satisfied: false, reason: '缺少npcId参数' };
  }
  
  const relationship = context.npcRelationships?.get(requirement.npcId);
  
  if (!relationship || !relationship.defeated) {
    return {
      satisfied: false,
      reason: `需要击败${requirement.npcId}`,
    };
  }
  
  return { satisfied: true };
}

function checkNpcNotDefeatedRequirement(
  requirement: Requirement,
  context: PlayerContext
): RequirementCheckResult {
  if (!requirement.npcId) {
    return { satisfied: false, reason: '缺少npcId参数' };
  }
  
  const relationship = context.npcRelationships?.get(requirement.npcId);
  
  if (relationship && relationship.defeated) {
    return {
      satisfied: false,
      reason: `不能已击败${requirement.npcId}`,
    };
  }
  
  return { satisfied: true };
}

function checkSkillUnlockedRequirement(
  requirement: Requirement,
  context: PlayerContext
): RequirementCheckResult {
  if (!requirement.skillId) {
    return { satisfied: false, reason: '缺少skillId参数' };
  }
  
  const unlockedSkills = context.unlockedSkills || [];
  const unlocked = unlockedSkills.includes(requirement.skillId);
  
  if (!unlocked) {
    return {
      satisfied: false,
      reason: `需要解锁技能：${requirement.skillId}`,
    };
  }
  
  return { satisfied: true };
}

function checkSkillNotUnlockedRequirement(
  requirement: Requirement,
  context: PlayerContext
): RequirementCheckResult {
  if (!requirement.skillId) {
    return { satisfied: false, reason: '缺少skillId参数' };
  }
  
  const unlockedSkills = context.unlockedSkills || [];
  const unlocked = unlockedSkills.includes(requirement.skillId);
  
  if (unlocked) {
    return {
      satisfied: false,
      reason: `不能已解锁技能：${requirement.skillId}`,
    };
  }
  
  return { satisfied: true };
}

function checkFirstTimeRequirement(
  requirement: Requirement,
  context: PlayerContext
): RequirementCheckResult {
  // 首次交互条件需要在调用时传入额外的NPC ID信息
  // 这里假设requirement中包含npcId
  if (!requirement.npcId) {
    return { satisfied: false, reason: '缺少npcId参数用于首次交互检查' };
  }
  
  const relationship = context.npcRelationships?.get(requirement.npcId);
  
  if (relationship && relationship.dialoguesCount > 0) {
    return {
      satisfied: false,
      reason: '此对话只能在首次交互时触发',
    };
  }
  
  return { satisfied: true };
}

function checkAffectionLevelRequirement(
  requirement: Requirement,
  context: PlayerContext
): RequirementCheckResult {
  if (!requirement.npcId) {
    return { satisfied: false, reason: '缺少npcId参数' };
  }
  
  const relationship = context.npcRelationships?.get(requirement.npcId);
  
  if (!relationship) {
    return {
      satisfied: false,
      reason: `尚未与${requirement.npcId}建立关系`,
    };
  }
  
  // 检查好感度等级
  if (requirement.affectionLevel) {
    const levels = ['stranger', 'acquaintance', 'friend', 'close_friend', 'master'];
    const requiredIndex = levels.indexOf(requirement.affectionLevel);
    const currentIndex = levels.indexOf(relationship.affectionLevel);
    
    if (currentIndex < requiredIndex) {
      return {
        satisfied: false,
        reason: `需要好感度等级：${requirement.affectionLevel}（当前${relationship.affectionLevel}）`,
      };
    }
  }
  
  // 检查好感度数值
  if (requirement.minAffection && relationship.affection < requirement.minAffection) {
    return {
      satisfied: false,
      reason: `需要好感度${requirement.minAffection}（当前${relationship.affection}）`,
    };
  }
  
  if (requirement.maxAffection && relationship.affection > requirement.maxAffection) {
    return {
      satisfied: false,
      reason: `好感度不能超过${requirement.maxAffection}（当前${relationship.affection}）`,
    };
  }
  
  return { satisfied: true };
}

function checkDefeatedCountRequirement(
  requirement: Requirement,
  context: PlayerContext
): RequirementCheckResult {
  if (!requirement.npcId) {
    return { satisfied: false, reason: '缺少npcId参数' };
  }
  
  const relationship = context.npcRelationships?.get(requirement.npcId);
  const defeatedCount = relationship?.battlesWon || 0;
  
  if (requirement.minDefeatedCount && defeatedCount < requirement.minDefeatedCount) {
    return {
      satisfied: false,
      reason: `需要击败${requirement.minDefeatedCount}次（当前${defeatedCount}次）`,
    };
  }
  
  if (requirement.maxDefeatedCount && defeatedCount > requirement.maxDefeatedCount) {
    return {
      satisfied: false,
      reason: `击败次数不能超过${requirement.maxDefeatedCount}次（当前${defeatedCount}次）`,
    };
  }
  
  return { satisfied: true };
}

function checkItemPossessedRequirement(
  requirement: Requirement,
  context: PlayerContext
): RequirementCheckResult {
  if (!requirement.itemId) {
    return { satisfied: false, reason: '缺少itemId参数' };
  }
  
  const requiredCount = requirement.itemCount || 1;
  const ownedCount = context.inventory?.get(requirement.itemId) || 0;
  
  if (ownedCount < requiredCount) {
    return {
      satisfied: false,
      reason: `需要物品${requirement.itemId} x${requiredCount}（当前x${ownedCount}）`,
    };
  }
  
  return { satisfied: true };
}

function checkAndRequirement(
  requirement: Requirement,
  context: PlayerContext
): RequirementCheckResult {
  if (!requirement.conditions || requirement.conditions.length === 0) {
    return { satisfied: true };
  }
  
  const results = requirement.conditions.map((cond) => checkRequirement(cond, context));
  const allSatisfied = results.every((r) => r.satisfied);
  
  if (!allSatisfied) {
    const reasons = results
      .filter((r) => !r.satisfied)
      .map((r) => r.reason)
      .filter(Boolean);
    
    return {
      satisfied: false,
      reason: reasons.join(' 且 '),
      missingRequirements: results
        .filter((r) => !r.satisfied)
        .flatMap((r) => r.missingRequirements || []),
    };
  }
  
  return { satisfied: true };
}

function checkOrRequirement(
  requirement: Requirement,
  context: PlayerContext
): RequirementCheckResult {
  if (!requirement.conditions || requirement.conditions.length === 0) {
    return { satisfied: true };
  }
  
  const results = requirement.conditions.map((cond) => checkRequirement(cond, context));
  const anySatisfied = results.some((r) => r.satisfied);
  
  if (!anySatisfied) {
    const reasons = results.map((r) => r.reason).filter(Boolean);
    
    return {
      satisfied: false,
      reason: `需要满足以下任一条件：${reasons.join(' 或 ')}`,
    };
  }
  
  return { satisfied: true };
}

function checkNotRequirement(
  requirement: Requirement,
  context: PlayerContext
): RequirementCheckResult {
  if (!requirement.conditions || requirement.conditions.length === 0) {
    return { satisfied: true };
  }
  
  const innerResult = checkRequirement(requirement.conditions[0], context);
  
  if (innerResult.satisfied) {
    return {
      satisfied: false,
      reason: `不能满足：${requirement.conditions[0].description || '该条件'}`,
    };
  }
  
  return { satisfied: true };
}
