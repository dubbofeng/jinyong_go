import { pgTable, serial, varchar, text, timestamp, integer, boolean, json } from 'drizzle-orm/pg-core';

// 用户表
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  username: varchar('username', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 游戏进度表
export const gameProgress = pgTable('game_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  
  // 玩家信息
  playerName: varchar('player_name', { length: 100 }),
  level: integer('level').default(1).notNull(),
  experience: integer('experience').default(0).notNull(),
  
  // 当前位置
  currentMap: varchar('current_map', { length: 100 }).default('huashan').notNull(),
  currentX: integer('current_x').default(0).notNull(),
  currentY: integer('current_y').default(0).notNull(),
  
  // 章节进度
  currentChapter: integer('current_chapter').default(1).notNull(),
  completedTasks: json('completed_tasks').$type<string[]>().default([]).notNull(),
  
  // 技能系统
  unlockedSkills: json('unlocked_skills').$type<string[]>().default([]).notNull(),
  skillLevels: json('skill_levels').$type<Record<string, number>>().default({}).notNull(),
  
  // 对战统计
  totalGames: integer('total_games').default(0).notNull(),
  wins: integer('wins').default(0).notNull(),
  losses: integer('losses').default(0).notNull(),
  
  // 保存时间
  lastSavedAt: timestamp('last_saved_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 对战记录表
export const chessRecords = pgTable('chess_records', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  
  // 对战信息
  opponentType: varchar('opponent_type', { length: 50 }).notNull(), // 'ai' or 'player'
  opponentName: varchar('opponent_name', { length: 100 }).notNull(),
  difficulty: integer('difficulty').notNull(), // 1-9
  
  // 棋盘设置
  boardSize: integer('board_size').notNull(), // 9, 13, 19
  
  // 对战结果
  result: varchar('result', { length: 20 }).notNull(), // 'win', 'loss', 'draw'
  playerColor: varchar('player_color', { length: 10 }).notNull(), // 'black' or 'white'
  
  // 棋谱数据
  moves: json('moves').$type<Array<{ x: number; y: number; color: string }>>().notNull(),
  finalScore: json('final_score').$type<{ black: number; white: number }>(),
  
  // 技能使用记录
  skillsUsed: json('skills_used').$type<Array<{ skill: string; step: number }>>().default([]).notNull(),
  
  // 对战时长（秒）
  duration: integer('duration').notNull(),
  
  // 时间戳
  playedAt: timestamp('played_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// NPC表
export const npcs = pgTable('npcs', {
  id: serial('id').primaryKey(),
  npcId: varchar('npc_id', { length: 50 }).notNull().unique(), // 'hongqigong', 'linghuchong', etc.
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  
  // NPC位置
  mapId: varchar('map_id', { length: 100 }).notNull(),
  positionX: integer('position_x').notNull(),
  positionY: integer('position_y').notNull(),
  
  // 对话数据
  dialogues: json('dialogues').$type<any>().notNull(),
  
  // NPC类型和属性
  npcType: varchar('npc_type', { length: 50 }).notNull(), // 'teacher', 'opponent', 'merchant', etc.
  difficulty: integer('difficulty'), // AI难度（如果是对手）
  
  // 教授的技能
  teachableSkills: json('teachable_skills').$type<string[]>().default([]).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 任务表
export const quests = pgTable('quests', {
  id: serial('id').primaryKey(),
  questId: varchar('quest_id', { length: 50 }).notNull().unique(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  
  // 任务类型和章节
  questType: varchar('quest_type', { length: 50 }).notNull(), // 'main', 'side', 'tutorial'
  chapter: integer('chapter').notNull(),
  
  // 任务要求
  requirements: json('requirements').$type<any>().notNull(),
  
  // 任务奖励
  rewards: json('rewards').$type<{
    experience?: number;
    skills?: string[];
    items?: string[];
  }>().notNull(),
  
  // 前置任务
  prerequisiteQuests: json('prerequisite_quests').$type<string[]>().default([]).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type GameProgress = typeof gameProgress.$inferSelect;
export type NewGameProgress = typeof gameProgress.$inferInsert;

export type ChessRecord = typeof chessRecords.$inferSelect;
export type NewChessRecord = typeof chessRecords.$inferInsert;

export type NPC = typeof npcs.$inferSelect;
export type NewNPC = typeof npcs.$inferInsert;

export type Quest = typeof quests.$inferSelect;
export type NewQuest = typeof quests.$inferInsert;
