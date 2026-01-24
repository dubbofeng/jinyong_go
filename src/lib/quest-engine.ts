/**
 * 任务系统引擎
 * 负责任务触发、追踪、完成和奖励发放
 */

import { db } from '@/app/db';
import { quests, gameProgress, users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export interface QuestRequirements {
  level?: number;
  defeat?: string; // NPC ID to defeat
  boardSize?: number; // Go board size (9, 13, 19)
  wins?: number; // Number of wins required
  completedQuests?: string[]; // Quest IDs that must be completed
}

export interface QuestRewards {
  experience?: number;
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
 * 检查玩家是否满足任务要求
 */
export async function checkQuestRequirements(
  userId: number,
  requirements: QuestRequirements
): Promise<{ met: boolean; reason?: string }> {
  // 获取玩家进度
  const [progress] = await db
    .select()
    .from(gameProgress)
    .where(eq(gameProgress.userId, userId))
    .limit(1);

  if (!progress) {
    return { met: false, reason: 'Player progress not found' };
  }

  // 检查等级要求
  if (requirements.level && progress.level < requirements.level) {
    return {
      met: false,
      reason: `Level ${requirements.level} required (current: ${progress.level})`,
    };
  }

  // 检查前置任务
  if (requirements.completedQuests && requirements.completedQuests.length > 0) {
    const completedQuestIds = progress.completedQuests as string[] || [];
    const missingQuests = requirements.completedQuests.filter(
      (questId) => !completedQuestIds.includes(questId)
    );
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
 * 开始任务
 */
export async function startQuest(
  userId: number,
  questId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 获取任务数据
    const [quest] = await db
      .select()
      .from(quests)
      .where(eq(quests.questId, questId))
      .limit(1);

    if (!quest) {
      return { success: false, message: 'Quest not found' };
    }

    // 检查要求
    const requirementCheck = await checkQuestRequirements(
      userId,
      quest.requirements as QuestRequirements
    );

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

    // 更新当前任务和活跃任务列表
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
    // 实现任务进度更新逻辑
    // 这里可以根据具体需求扩展
    return { success: true, message: 'Progress updated' };
  } catch (error) {
    console.error('Error updating quest progress:', error);
    return { success: false, message: 'Failed to update progress' };
  }
}

/**
 * 完成任务并发放奖励
 */
export async function completeQuest(
  userId: number,
  questId: string
): Promise<{ success: boolean; message: string; rewards?: QuestRewards }> {
  try {
    // 获取任务数据
    const [quest] = await db
      .select()
      .from(quests)
      .where(eq(quests.questId, questId))
      .limit(1);

    if (!quest) {
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
    const rewards = quest.rewards as QuestRewards;
    let newExperience = progress.experience;
    let newLevel = progress.level;

    if (rewards.experience) {
      newExperience += rewards.experience;
      // 简单升级逻辑：每100经验升1级
      newLevel = Math.floor(newExperience / 100) + 1;
    }

    // 解锁技能
    const unlockedSkills = (progress.unlockedSkills as string[]) || [];
    if (rewards.skills) {
      rewards.skills.forEach((skill) => {
        if (!unlockedSkills.includes(skill)) {
          unlockedSkills.push(skill);
        }
      });
    }

    // 更新进度
    completedQuestIds.push(questId);
    const activeQuests = ((progress.activeQuests as string[]) || []).filter(
      (id) => id !== questId
    );

    await db
      .update(gameProgress)
      .set({
        experience: newExperience,
        level: newLevel,
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
 * 获取玩家可用任务列表
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

    // 获取所有任务
    const allQuests = await db.select().from(quests);

    // 过滤可用任务
    const completedQuestIds = (progress.completedQuests as string[]) || [];
    const activeQuestIds = (progress.activeQuests as string[]) || [];

    const availableQuests = [];

    for (const quest of allQuests) {
      // 跳过已完成和正在进行的任务
      if (completedQuestIds.includes(quest.questId) || activeQuestIds.includes(quest.questId)) {
        continue;
      }

      // 检查要求
      const requirementCheck = await checkQuestRequirements(
        userId,
        quest.requirements as QuestRequirements
      );

      if (requirementCheck.met) {
        availableQuests.push({
          ...quest,
          canStart: true,
        });
      } else {
        availableQuests.push({
          ...quest,
          canStart: false,
          lockReason: requirementCheck.reason,
        });
      }
    }

    return availableQuests;
  } catch (error) {
    console.error('Error getting available quests:', error);
    return [];
  }
}

/**
 * 获取玩家活跃任务
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

    const activeQuests = [];
    for (const questId of activeQuestIds) {
      const [quest] = await db
        .select()
        .from(quests)
        .where(eq(quests.questId, questId))
        .limit(1);

      if (quest) {
        activeQuests.push(quest);
      }
    }

    return activeQuests;
  } catch (error) {
    console.error('Error getting active quests:', error);
    return [];
  }
}
