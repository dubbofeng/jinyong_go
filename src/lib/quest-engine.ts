/**
 * 任务系统引擎
 * 负责任务触发、追踪、完成和奖励发放
 * 使用混合架构：静态定义（JSON）+ 动态状态（数据库）
 */

import { db } from '@/app/db';
import { questProgress, gameProgress, users, playerStats, playerSkills, npcRelationships } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { getExperienceForLevel } from '@/src/lib/rank-system';
import {
  getAllQuests,
  getQuestById,
  checkQuestPrerequisites,
  mergeQuestWithProgress,
  checkObjectiveCompletion,
  type QuestDefinition,
  type QuestObjective,
} from '@/src/lib/quest-manager';

export interface QuestRequirements {
  level?: number;
  defeat?: string; // NPC ID to defeat
  boardSize?: number; // Go board size (9, 13, 19)
  wins?: number; // Number of wins required
  completedQuests?: string[]; // Quest IDs that must be completed
}

export interface QuestRewards {
  experience?: number;
  silver?: number;
  skill?: string;
  skills?: string[];
  items?: string[];
}

export interface QuestProgress {
  questId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: {
    [key: string]: number | boolean | string;
  };
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * 检查玩家是否满足任务要求（使用JSON定义）
 */
export async function checkQuestRequirementsFromProgress(
  userId: number,
  questId: string
): Promise<{ met: boolean; reason?: string }> {
  // 获取quest定义
  const questDef = getQuestById(questId);
  if (!questDef) {
    return { met: false, reason: 'Quest not found' };
  }

  // 获取玩家进度
  const [progress] = await db
    .select()
    .from(gameProgress)
    .where(eq(gameProgress.userId, userId))
    .limit(1);

  if (!progress) {
    return { met: false, reason: 'Player progress not found' };
  }

  const [stats] = await db
    .select({ level: playerStats.level })
    .from(playerStats)
    .where(eq(playerStats.userId, userId))
    .limit(1);

  if (!stats) {
    return { met: false, reason: 'Player stats not found' };
  }

  // 检查等级要求（如果有）
  // 可以根据章节推断等级要求
  const minLevel = questDef.chapter * 10; // 简单映射：章节*10
  if (stats.level < minLevel) {
    return {
      met: false,
      reason: `Level ${minLevel} required (current: ${stats.level})`,
    };
  }

  // 检查前置任务
  const completedQuestIds = (progress.completedQuests as string[]) || [];
  const prerequisiteCheck = checkQuestPrerequisites(questId, completedQuestIds);
  
  if (!prerequisiteCheck) {
    const missingQuests = questDef.prerequisiteQuests?.filter(
      (preQuestId) => !completedQuestIds.includes(preQuestId)
    ) || [];
    
    if (missingQuests.length > 0) {
      return {
        met: false,
        reason: `Complete required quests: ${missingQuests.join(', ')}`,
      };
    }
  }

  return { met: true };
}

/**
 * 开始任务（使用JSON定义）
 */
export async function startQuest(
  userId: number,
  questId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 从JSON获取任务定义
    const questDef = getQuestById(questId);
    if (!questDef) {
      return { success: false, message: 'Quest not found' };
    }

    // 检查要求
    const requirementCheck = await checkQuestRequirementsFromProgress(userId, questId);

    if (!requirementCheck.met) {
      return { success: false, message: requirementCheck.reason || 'Requirements not met' };
    }

    // 获取玩家进度
    const [progress] = await db
      .select()
      .from(gameProgress)
      .where(eq(gameProgress.userId, userId))
      .limit(1);

    if (!progress) {
      return { success: false, message: 'Player progress not found' };
    }

    // 检查是否已有quest进度记录
    const [existingProgress] = await db
      .select()
      .from(questProgress)
      .where(
        and(
          eq(questProgress.userId, userId),
          eq(questProgress.questId, questId)
        )
      )
      .limit(1);

    if (existingProgress && existingProgress.status === 'completed') {
      return { success: false, message: 'Quest already completed' };
    }

    // 创建或更新quest进度记录
    if (existingProgress) {
      await db
        .update(questProgress)
        .set({
          status: 'in_progress',
          startedAt: existingProgress.startedAt || new Date(),
          updatedAt: new Date(),
        })
        .where(eq(questProgress.id, existingProgress.id));
    } else {
      await db.insert(questProgress).values({
        userId,
        questId,
        status: 'in_progress',
        progress: {},
        currentStep: 0,
        totalSteps: questDef.objectives.length,
        startedAt: new Date(),
      });
    }

    // 更新游戏进度中的活跃任务列表
    const activeQuests = (progress.activeQuests as string[]) || [];
    if (!activeQuests.includes(questId)) {
      activeQuests.push(questId);
    }

    await db
      .update(gameProgress)
      .set({
        currentQuest: questId,
        activeQuests: activeQuests,
        updatedAt: new Date(),
      })
      .where(eq(gameProgress.userId, userId));

    return { success: true, message: 'Quest started successfully' };
  } catch (error) {
    console.error('Error starting quest:', error);
    return { success: false, message: 'Failed to start quest' };
  }
}

/**
 * 更新任务进度
 */
export async function updateQuestProgress(
  userId: number,
  questId: string,
  progressData: { [key: string]: number | boolean | string }
): Promise<{ success: boolean; message: string }> {
  try {
    // 检查quest定义是否存在
    const questDef = getQuestById(questId);
    if (!questDef) {
      return { success: false, message: 'Quest not found' };
    }

    // 查找现有进度记录
    const [existing] = await db
      .select()
      .from(questProgress)
      .where(
        and(
          eq(questProgress.userId, userId),
          eq(questProgress.questId, questId)
        )
      )
      .limit(1);

    if (!existing) {
      return { success: false, message: 'Quest not started' };
    }

    // 合并进度数据
    const currentProgress = (existing.progress as Record<string, any>) || {};
    const updatedProgress = { ...currentProgress, ...progressData };

    // 更新进度
    await db
      .update(questProgress)
      .set({
        progress: updatedProgress,
        updatedAt: new Date(),
      })
      .where(eq(questProgress.id, existing.id));

    return { success: true, message: 'Progress updated' };
  } catch (error) {
    console.error('Error updating quest progress:', error);
    return { success: false, message: 'Failed to update progress' };
  }
}

/**
 * 完成任务并发放奖励（使用JSON定义）
 */
export async function completeQuest(
  userId: number,
  questId: string
): Promise<{ success: boolean; message: string; rewards?: QuestRewards }> {
  try {
    // 从JSON获取任务定义
    const questDef = getQuestById(questId);
    if (!questDef) {
      return { success: false, message: 'Quest not found' };
    }

    // 获取玩家进度
    const [progress] = await db
      .select()
      .from(gameProgress)
      .where(eq(gameProgress.userId, userId))
      .limit(1);

    if (!progress) {
      return { success: false, message: 'Player progress not found' };
    }

    // 检查任务是否已完成
    const completedQuestIds = (progress.completedQuests as string[]) || [];
    if (completedQuestIds.includes(questId)) {
      return { success: false, message: 'Quest already completed' };
    }

    // 发放奖励
    const rewards = questDef.rewards;

    const [stats] = await db
      .select()
      .from(playerStats)
      .where(eq(playerStats.userId, userId))
      .limit(1);

    if (!stats) {
      return { success: false, message: 'Player stats not found' };
    }

    let newExperience = stats.experience;
    let newLevel = stats.level;
    let expToNext = stats.experienceToNext;
    let maxStamina = stats.maxStamina;
    let maxQi = stats.maxQi;
    let newSilver = stats.silver || 0;

    if (rewards.experience) {
      newExperience += rewards.experience;

      while (newExperience >= expToNext && newLevel < 27) {
        newExperience -= expToNext;
        newLevel++;
        expToNext = getExperienceForLevel(newLevel);
        maxStamina += 10;
        maxQi += 10;
      }

      if (newLevel >= 27) {
        newExperience = 0;
        expToNext = 0;
      }
    }

    if (rewards.silver) {
      newSilver += rewards.silver;
    }

    const skillRewards = new Set<string>();
    if (rewards.skill) skillRewards.add(rewards.skill);
    if (rewards.skills) rewards.skills.forEach((skill) => skillRewards.add(skill));

    const leveledUp = newLevel > stats.level;

    await db.transaction(async (tx) => {
      // 更新quest进度状态
      await tx
        .update(questProgress)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(questProgress.userId, userId),
            eq(questProgress.questId, questId)
          )
        );

      // 更新玩家属性
      await tx
        .update(playerStats)
        .set({
          level: newLevel,
          experience: newExperience,
          experienceToNext: expToNext,
          maxStamina,
          maxQi,
          stamina: leveledUp ? maxStamina : stats.stamina,
          qi: leveledUp ? maxQi : stats.qi,
          silver: newSilver,
          updatedAt: new Date(),
        })
        .where(eq(playerStats.userId, userId));

      // 解锁技能
      if (skillRewards.size > 0) {
        const existingSkills = await tx
          .select({ skillId: playerSkills.skillId, unlocked: playerSkills.unlocked })
          .from(playerSkills)
          .where(eq(playerSkills.userId, userId));

        const existingMap = new Map(existingSkills.map((s) => [s.skillId, s]));

        for (const skillId of skillRewards) {
          const existing = existingMap.get(skillId);
          if (existing) {
            if (!existing.unlocked) {
              await tx
                .update(playerSkills)
                .set({ unlocked: true, unlockedAt: new Date() })
                .where(and(eq(playerSkills.userId, userId), eq(playerSkills.skillId, skillId)));
            }
          } else {
            await tx.insert(playerSkills).values({
              userId,
              skillId,
              unlocked: true,
              level: 1,
              experience: 0,
              unlockedAt: new Date(),
            });
          }
        }
      }

      // 更新游戏进度
      completedQuestIds.push(questId);
      const activeQuests = ((progress.activeQuests as string[]) || []).filter(
        (id) => id !== questId
      );

      await tx
        .update(gameProgress)
        .set({
          completedQuests: completedQuestIds,
          activeQuests: activeQuests,
          currentQuest: activeQuests.length > 0 ? activeQuests[0] : null,
          updatedAt: new Date(),
        })
        .where(eq(gameProgress.userId, userId));
    });

    // 如果升级了，检查 reach_level 任务
    if (leveledUp) {
      await autoCompleteQuests(userId, { level: newLevel });
    }

    return {
      success: true,
      message: 'Quest completed successfully',
      rewards,
    };
  } catch (error) {
    console.error('Error completing quest:', error);
    return { success: false, message: 'Failed to complete quest' };
  }
}
/**
 * 获取玩家可用任务列表（使用JSON定义）
 */
export async function getAvailableQuests(userId: number): Promise<any[]> {
  try {
    // 获取玩家进度
    const [progress] = await db
      .select()
      .from(gameProgress)
      .where(eq(gameProgress.userId, userId))
      .limit(1);

    if (!progress) {
      return [];
    }

    const [stats] = await db
      .select({ level: playerStats.level })
      .from(playerStats)
      .where(eq(playerStats.userId, userId))
      .limit(1);

    if (!stats) {
      return [];
    }

    // 从JSON获取所有任务定义
    const allQuestsMap = getAllQuests();
    const allQuests = Object.values(allQuestsMap);

    // 过滤可用任务
    const completedQuestIds = (progress.completedQuests as string[]) || [];
    const activeQuestIds = (progress.activeQuests as string[]) || [];

    // 获取所有quest进度记录
    const progressRecords = await db
      .select()
      .from(questProgress)
      .where(eq(questProgress.userId, userId));

    const progressMap = new Map(
      progressRecords.map((p) => [p.questId, p])
    );

    const availableQuests = [];

    for (const questDef of allQuests) {
      // 跳过已完成的任务
      if (completedQuestIds.includes(questDef.id)) {
        continue;
      }

      // 检查是否正在进行
      const isActive = activeQuestIds.includes(questDef.id);

      // 检查前置任务
      const prerequisitesMet = checkQuestPrerequisites(questDef.id, completedQuestIds);

      // 检查等级要求
      const minLevel = questDef.chapter * 10;
      const levelMet = stats.level >= minLevel;

      // 合并定义和进度
      const progressData = progressMap.get(questDef.id);
      const quest = mergeQuestWithProgress(questDef, progressData);

      availableQuests.push({
        ...quest,
        canStart: prerequisitesMet && levelMet && !isActive,
        isActive,
        lockReason: !prerequisitesMet 
          ? 'Prerequisites not met' 
          : !levelMet 
          ? `Level ${minLevel} required` 
          : undefined,
      });
    }

    return availableQuests;
  } catch (error) {
    console.error('Error getting available quests:', error);
    return [];
  }
}

/**
 * 获取玩家活跃任务（使用JSON定义）
 */
export async function getActiveQuests(userId: number): Promise<any[]> {
  try {
    const [progress] = await db
      .select()
      .from(gameProgress)
      .where(eq(gameProgress.userId, userId))
      .limit(1);

    if (!progress) {
      return [];
    }

    const activeQuestIds = (progress.activeQuests as string[]) || [];
    if (activeQuestIds.length === 0) {
      return [];
    }

    // 获取所有活跃quest的进度记录
    const progressRecords = await db
      .select()
      .from(questProgress)
      .where(eq(questProgress.userId, userId));

    const progressMap = new Map(
      progressRecords.map((p) => [p.questId, p])
    );

    const activeQuests = [];
    for (const questId of activeQuestIds) {
      const questDef = getQuestById(questId);
      if (questDef) {
        const progressData = progressMap.get(questId);
        const quest = mergeQuestWithProgress(questDef, progressData);
        activeQuests.push(quest);
      }
    }

    return activeQuests;
  } catch (error) {
    console.error('Error getting active quests:', error);
    return [];
  }
}

/**
 * 自动检查并完成符合条件的任务
 * 通用函数，用于各种任务目标类型的自动完成
 */
export async function autoCompleteQuests(
  userId: number,
  context?: {
    npcId?: string;
    itemId?: string;
    level?: number;
    tutorialCompleted?: boolean;
    defeatedNpc?: string;
  }
): Promise<string[]> {
  const completedQuests: string[] = [];

  try {
    // 查找所有进行中的任务
    const activeQuestProgress = await db
      .select()
      .from(questProgress)
      .where(
        and(
          eq(questProgress.userId, userId),
          eq(questProgress.status, 'in_progress')
        )
      );

    if (activeQuestProgress.length === 0) {
      return completedQuests;
    }

    // 获取所有任务定义
    const allQuestsObj = getAllQuests();
    const allQuests = Object.values(allQuestsObj);

    // 获取NPC关系（用于检查defeat_npc目标）
    const npcRelations = await db
      .select()
      .from(npcRelationships)
      .where(eq(npcRelationships.userId, userId));

    const npcRelationsMap = new Map(
      npcRelations.map((rel) => [rel.npcId, rel])
    );

    // 获取玩家等级（用于检查reach_level目标）
    const [stats] = await db
      .select()
      .from(playerStats)
      .where(eq(playerStats.userId, userId))
      .limit(1);

    const playerLevel = stats?.level || 1;

    // 检查每个进行中的任务
    for (const progress of activeQuestProgress) {
      const quest = allQuests.find((q) => q.id === progress.questId);
      if (!quest) continue;

      // 构建完整的进度数据（合并当前上下文）
      const progressData = (progress.progress as Record<string, any>) || {};
      
      if (context?.tutorialCompleted) {
        progressData.tutorial_completed = true;
      }
      if (context?.level) {
        progressData.current_level = context.level;
      }

      // 检查所有目标是否都已完成
      const allObjectivesCompleted = quest.objectives.every((obj) => {
        // 特殊处理：如果当前操作刚完成某个目标
        if (context?.defeatedNpc && obj.type === 'defeat_npc' && obj.target === context.defeatedNpc) {
          return true;
        }
        if (context?.npcId && obj.type === 'dialogue' && obj.target === context.npcId) {
          return true;
        }
        if (context?.npcId && obj.type === 'meet_npc' && obj.target === context.npcId) {
          return true;
        }

        // 使用checkObjectiveCompletion检查其他目标
        if (obj.type === 'defeat_npc' && obj.target) {
          const npcRel = npcRelationsMap.get(obj.target);
          return npcRel?.defeated === true;
        }
        if (obj.type === 'reach_level') {
          return playerLevel >= (obj.count || 1);
        }

        return checkObjectiveCompletion(obj, progressData);
      });

      // 如果所有目标都完成，自动完成任务
      if (allObjectivesCompleted) {
        try {
          const result = await completeQuest(userId, quest.id);
          if (result.success) {
            completedQuests.push(quest.id);
            console.log(`Auto-completed quest: ${quest.id} for user ${userId}`);
          }
        } catch (error) {
          console.error(`Failed to auto-complete quest ${quest.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error in autoCompleteQuests:', error);
  }

  return completedQuests;
}
