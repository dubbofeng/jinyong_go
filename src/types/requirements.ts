/**
 * NPC对话条件系统类型定义
 */

// 基础条件类型
export type RequirementType =
  | 'level'              // 等级要求
  | 'chapter'            // 章节要求
  | 'quest_completed'    // 任务完成
  | 'npc_defeated'       // NPC已击败
  | 'npc_not_defeated'   // NPC未击败
  | 'skill_unlocked'     // 技能已解锁
  | 'skill_not_unlocked' // 技能未解锁
  | 'first_time'         // 首次交互
  | 'affection_level'    // 好感度等级
  | 'defeated_count'     // 击败次数
  | 'item_possessed'     // 拥有物品
  | 'and'                // 逻辑与
  | 'or'                 // 逻辑或
  | 'not';               // 逻辑非

// 单个条件定义
export interface Requirement {
  type: RequirementType;
  
  // 等级条件
  minLevel?: number;
  maxLevel?: number;
  
  // 章节条件
  chapter?: number;
  
  // 任务条件
  questId?: string;
  
  // NPC条件
  npcId?: string;
  
  // 技能条件
  skillId?: string;
  
  // 好感度条件
  affectionLevel?: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'master';
  minAffection?: number;
  maxAffection?: number;
  
  // 击败次数条件
  minDefeatedCount?: number;
  maxDefeatedCount?: number;
  
  // 物品条件
  itemId?: string;
  itemCount?: number;
  
  // 逻辑操作符的子条件
  conditions?: Requirement[];
  
  // 条件描述（用于UI显示）
  description?: string;
}

// 对话选项的要求
export interface DialogueRequirement {
  // 解锁此对话的条件
  unlockConditions?: Requirement[];
  
  // 显示但锁定的条件（满足才能选择）
  enableConditions?: Requirement[];
  
  // 锁定时显示的提示文本
  lockedHint?: string;
}

// 战斗的要求
export interface BattleRequirement {
  // 解锁战斗的条件
  unlockConditions?: Requirement[];
  
  // 是否可以重复挑战
  repeatable?: boolean;
  
  // 重复挑战的条件
  repeatConditions?: Requirement[];
  
  // 最大挑战次数
  maxAttempts?: number;
  
  // 冷却时间（秒）
  cooldownSeconds?: number;
  
  // 锁定时显示的提示文本
  lockedHint?: string;
}

// 条件检查结果
export interface RequirementCheckResult {
  satisfied: boolean;
  reason?: string; // 未满足时的原因
  missingRequirements?: Requirement[]; // 未满足的具体条件
}

// 辅助函数：创建常用条件
export const Requirements = {
  level: (minLevel: number, maxLevel?: number): Requirement => ({
    type: 'level',
    minLevel,
    maxLevel,
    description: maxLevel 
      ? `等级${minLevel}-${maxLevel}` 
      : `等级${minLevel}以上`,
  }),

  chapter: (chapter: number): Requirement => ({
    type: 'chapter',
    chapter,
    description: `第${chapter}章`,
  }),

  questCompleted: (questId: string): Requirement => ({
    type: 'quest_completed',
    questId,
    description: `完成任务：${questId}`,
  }),

  npcDefeated: (npcId: string): Requirement => ({
    type: 'npc_defeated',
    npcId,
    description: `击败${npcId}`,
  }),

  npcNotDefeated: (npcId: string): Requirement => ({
    type: 'npc_not_defeated',
    npcId,
    description: `未击败${npcId}`,
  }),

  skillUnlocked: (skillId: string): Requirement => ({
    type: 'skill_unlocked',
    skillId,
    description: `已学习${skillId}`,
  }),

  skillNotUnlocked: (skillId: string): Requirement => ({
    type: 'skill_not_unlocked',
    skillId,
    description: `未学习${skillId}`,
  }),

  firstTime: (): Requirement => ({
    type: 'first_time',
    description: '首次交互',
  }),

  affectionLevel: (level: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'master'): Requirement => ({
    type: 'affection_level',
    affectionLevel: level,
    description: `好感度：${level}`,
  }),

  affection: (minAffection: number, maxAffection?: number): Requirement => ({
    type: 'affection_level',
    minAffection,
    maxAffection,
    description: maxAffection
      ? `好感度${minAffection}-${maxAffection}`
      : `好感度${minAffection}以上`,
  }),

  defeatedCount: (minCount: number, maxCount?: number): Requirement => ({
    type: 'defeated_count',
    minDefeatedCount: minCount,
    maxDefeatedCount: maxCount,
    description: maxCount
      ? `击败${minCount}-${maxCount}次`
      : `击败${minCount}次以上`,
  }),

  itemPossessed: (itemId: string, count: number = 1): Requirement => ({
    type: 'item_possessed',
    itemId,
    itemCount: count,
    description: `拥有物品：${itemId} x${count}`,
  }),

  and: (...conditions: Requirement[]): Requirement => ({
    type: 'and',
    conditions,
    description: '满足所有条件',
  }),

  or: (...conditions: Requirement[]): Requirement => ({
    type: 'or',
    conditions,
    description: '满足任一条件',
  }),

  not: (condition: Requirement): Requirement => ({
    type: 'not',
    conditions: [condition],
    description: '不满足条件',
  }),
};

// 示例用法
export const exampleRequirements = {
  // 首次对话
  firstDialogue: {
    unlockConditions: [Requirements.firstTime()],
  } as DialogueRequirement,

  // 击败后的对话
  afterDefeatDialogue: {
    unlockConditions: [
      Requirements.and(
        Requirements.npcDefeated('guojing'),
        Requirements.not(Requirements.firstTime())
      ),
    ],
  } as DialogueRequirement,

  // 需要完成任务才能解锁的对话
  questLockedDialogue: {
    unlockConditions: [Requirements.questCompleted('prologue_meet_guojing')],
    lockedHint: '完成"初识郭靖"任务后解锁',
  } as DialogueRequirement,

  // 需要等级和章节的战斗
  bossChallenge: {
    unlockConditions: [
      Requirements.and(
        Requirements.level(10),
        Requirements.chapter(2)
      ),
    ],
    repeatable: true,
    repeatConditions: [Requirements.defeatedCount(1)],
    cooldownSeconds: 3600, // 1小时冷却
    lockedHint: '需要10级且达到第二章',
  } as BattleRequirement,
};
