/**
 * Quest Manager
 * 管理任务的静态定义和动态状态
 */

import questsData from '@/data/quests.json';
import type { GameProgress } from '@/src/db/schema';

// Quest定义类型（从JSON）
export interface QuestDefinition {
  id: string;
  npcId: string;
  chapter: number;
  name: {
    zh: string;
    en: string;
  };
  description: {
    zh: string;
    en: string;
  };
  questType: 'main' | 'side' | 'tutorial';
  objectives: QuestObjective[];
  rewards: QuestRewards;
  prerequisiteQuests: string[];
}

export interface QuestObjective {
  id: string;
  type:
    | 'defeat_npc'
    | 'meet_npc'
    | 'dialogue'
    | 'complete_tutorial'
    | 'collect_item'
    | 'reach_level';
  target?: string;
  count?: number;
  description: {
    zh: string;
    en: string;
  };
}

export interface QuestRewards {
  experience?: number;
  silver?: number;
  skill?: string;
  skills?: string[];
  items?: string[];
}

// Quest状态类型（从数据库）
export interface QuestProgress {
  id: number;
  userId: number;
  questId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  progress: {
    wins?: number;
    losses?: number;
    target_wins?: number;
    opponent?: string;
    [key: string]: any;
  };
  currentStep: number;
  totalSteps: number;
  startedAt: Date | null;
  completedAt: Date | null;
}

// 完整Quest类型（定义 + 状态）
export interface Quest extends QuestDefinition {
  status: QuestProgress['status'];
  progress: QuestProgress['progress'];
  currentStep: number;
  totalSteps: number;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * 获取所有quest定义
 */
export function getAllQuests(): Record<string, QuestDefinition> {
  return questsData as any;
}

/**
 * 根据ID获取quest定义
 */
export function getQuestById(questId: string): QuestDefinition | null {
  const quests = getAllQuests();
  return quests[questId] || null;
}

/**
 * 根据章节获取quests
 */
export function getQuestsByChapter(chapter: number): QuestDefinition[] {
  const quests = getAllQuests();
  return Object.values(quests).filter((q) => q.chapter === chapter);
}

/**
 * 根据NPC获取quest
 */
export function getQuestByNpc(npcId: string): QuestDefinition | null {
  const quests = getAllQuests();
  return Object.values(quests).find((q) => q.npcId === npcId) || null;
}

/**
 * 获取quest类型的所有quests
 */
export function getQuestsByType(questType: QuestDefinition['questType']): QuestDefinition[] {
  const quests = getAllQuests();
  return Object.values(quests).filter((q) => q.questType === questType);
}

/**
 * 检查玩家是否满足quest的前置条件
 */
export function checkQuestPrerequisites(questId: string, completedQuests: string[]): boolean {
  const quest = getQuestById(questId);
  if (!quest) return false;

  // 检查所有前置任务是否完成
  return quest.prerequisiteQuests.every((preQuestId) => completedQuests.includes(preQuestId));
}

/**
 * 检查玩家是否可以接取某个quest
 */
export function canAcceptQuest(
  questId: string,
  playerProgress: GameProgress
): { canAccept: boolean; reason?: string } {
  const quest = getQuestById(questId);
  if (!quest) {
    return { canAccept: false, reason: 'Quest not found' };
  }

  // 检查章节
  if (quest.chapter > playerProgress.currentChapter) {
    return {
      canAccept: false,
      reason: `Need to reach chapter ${quest.chapter}`,
    };
  }

  // 检查前置任务
  const completedQuests = playerProgress.completedTasks || [];
  if (!checkQuestPrerequisites(questId, completedQuests)) {
    const missingQuests = quest.prerequisiteQuests.filter(
      (preQuestId) => !completedQuests.includes(preQuestId)
    );
    return {
      canAccept: false,
      reason: `Complete prerequisite quests: ${missingQuests.join(', ')}`,
    };
  }

  return { canAccept: true };
}

/**
 * 合并quest定义和状态
 */
export function mergeQuestWithProgress(
  questDefinition: QuestDefinition,
  questProgress?: any
): Quest {
  return {
    ...questDefinition,
    status: (questProgress?.status as QuestProgress['status']) || 'not_started',
    progress: questProgress?.progress || {},
    currentStep: questProgress?.currentStep || 0,
    totalSteps: questProgress?.totalSteps || questDefinition.objectives.length,
    startedAt: questProgress?.startedAt || null,
    completedAt: questProgress?.completedAt || null,
  };
}

/**
 * 获取quest的本地化名称
 */
export function getQuestName(quest: QuestDefinition, locale: 'zh' | 'en'): string {
  return quest.name[locale];
}

/**
 * 获取quest的本地化描述
 */
export function getQuestDescription(quest: QuestDefinition, locale: 'zh' | 'en'): string {
  return quest.description[locale];
}

/**
 * 计算quest完成进度百分比
 */
export function calculateQuestProgress(quest: Quest): number {
  if (quest.status === 'completed') return 100;
  if (quest.status === 'not_started') return 0;

  return Math.round((quest.currentStep / quest.totalSteps) * 100);
}

/**
 * 检查quest目标是否完成
 */
export function checkObjectiveCompletion(
  objective: QuestObjective,
  progress: QuestProgress['progress']
): boolean {
  switch (objective.type) {
    case 'defeat_npc':
      return progress.opponent === objective.target && (progress.wins || 0) > 0;
    case 'meet_npc':
      return progress[`met_${objective.target}`] === true;
    case 'dialogue':
      return progress[`dialogue_${objective.target}`] === true;
    case 'complete_tutorial':
      return progress.tutorial_completed === true;
    case 'collect_item':
      return (progress[`collected_${objective.target}`] || 0) >= (objective.count || 1);
    case 'reach_level':
      return (progress.current_level || 0) >= (objective.count || 1);
    default:
      return false;
  }
}

/**
 * 获取下一个可接取的主线任务
 */
export function getNextMainQuest(completedQuests: string[]): QuestDefinition | null {
  const mainQuests = getQuestsByType('main');

  // 按chapter和id排序
  const sortedQuests = mainQuests.sort((a, b) => {
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.id.localeCompare(b.id);
  });

  // 找到第一个未完成且满足前置条件的任务
  for (const quest of sortedQuests) {
    if (!completedQuests.includes(quest.id) && checkQuestPrerequisites(quest.id, completedQuests)) {
      return quest;
    }
  }

  return null;
}

/**
 * 获取可用的支线任务列表
 */
export function getAvailableSideQuests(
  completedQuests: string[],
  currentChapter: number
): QuestDefinition[] {
  const sideQuests = getQuestsByType('side');

  return sideQuests.filter(
    (quest) =>
      !completedQuests.includes(quest.id) &&
      quest.chapter <= currentChapter &&
      checkQuestPrerequisites(quest.id, completedQuests)
  );
}

/**
 * 获取指定章节的所有NPC（通过任务中的npcId）
 */
export function getChapterNpcIds(chapter: number): string[] {
  const quests = Object.values(questsData as any) as QuestDefinition[];
  const npcIds = new Set<string>();

  quests.forEach((quest) => {
    if (quest.chapter === chapter && quest.npcId) {
      npcIds.add(quest.npcId);
    }
  });

  return Array.from(npcIds);
}
