/**
 * 任务系统引擎
 * 负责任务触发、追踪、完成和奖励发放
 * 使用混合架构：静态定义（JSON）+ 动态状态（数据库）
 */

import { db } from '@/app/db';
import { questProgress, gameProgress, users } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getAllQuests,
  getQuestById,
  checkQuestPrerequisites,
  mergeQuestWithProgress,
  type QuestDefinition,
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

  // 检查等级要求（如果有）
  // 可以根据章节推断等级要求
  const minLevel = questDef.chapter * 10; // 简单映射：章节*10
  if (progress.level < minLevel) {
    return {
      met: false,
      reason: `Level ${minLevel} required (current: ${progress.level})`,
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
    let newExperience = progress.experience;
    let newLevel = progress.level;
    let newSilver = progress.silver || 0;

    if (rewards.experience) {
      newExperience += rewards.experience;
      // 简单升级逻辑：每100经验升1级
      newLevel = Math.floor(newExperience / 100) + 1;
    }

    if (rewards.silver) {
      newSilver += rewards.silver;
    }

    // 解锁技能
    const unlockedSkills = (progress.unlockedSkills as string[]) || [];
    if (rewards.skill && !unlockedSkills.includes(rewards.skill)) {
      unlockedSkills.push(rewards.skill);
    }
    if (rewards.skills) {
      rewards.skills.forEach((skill) => {
        if (!unlockedSkills.includes(skill)) {
          unlockedSkills.push(skill);
        }
      });
    }

    // 更新quest进度状态
    await db
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

    // 更新游戏进度
    completedQuestIds.push(questId);
    const activeQuests = ((progress.activeQuests as string[]) || []).filter(
      (id) => id !== questId
    );

    await db
      .update(gameProgress)
      .set({
        experience: newExperience,
        level: newLevel,
        silver: newSilver,
        completedQuests: completedQuestIds,
        activeQuests: activeQuests,
        currentQuest: activeQuests.length > 0 ? activeQuests[0] : null,
        unlockedSkills: unlockedSkills,
        updatedAt: new Date(),
      })
      .where(eq(gameProgress.userId, userId));

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
      const levelMet = progress.level >= minLevel;

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
