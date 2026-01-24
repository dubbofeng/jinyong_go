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
  
  // 任务系统
  currentQuest: varchar('current_quest', { length: 100 }),
  activeQuests: json('active_quests').$type<string[]>().default([]).notNull(),
  completedQuests: json('completed_quests').$type<string[]>().default([]).notNull(),
  
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

// =============== Isometric 地图系统 ===============

// 地图表（用于世界地图和场景地图）
export const maps = pgTable('maps', {
  id: serial('id').primaryKey(),
  mapId: varchar('map_id', { length: 100 }).notNull().unique(), // 'world_map', 'huashan_scene', etc.
  name: varchar('name', { length: 200 }).notNull(),
  mapType: varchar('map_type', { length: 50 }).notNull(), // 'world' or 'scene'
  description: text('description'),
  width: integer('width').default(32).notNull(), // 地图宽度（瓦片数）
  height: integer('height').default(32).notNull(), // 地图高度（瓦片数）
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 地图瓦片表
export const mapTiles = pgTable('map_tiles', {
  id: serial('id').primaryKey(),
  mapId: integer('map_id').notNull().references(() => maps.id),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  tileType: varchar('tile_type', { length: 50 }).notNull(), // water, gold, wood, fire, dirt
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 地图物品/建筑/装饰位置表
export const mapItems = pgTable('map_items', {
  id: serial('id').primaryKey(),
  mapId: integer('map_id').notNull().references(() => maps.id),
  itemName: text('item_name').notNull(),
  itemPath: text('item_path').notNull(),
  itemType: varchar('item_type', { length: 50 }).notNull(), // 'building', 'plant', 'decoration', 'portal'
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  width: integer('width'),
  height: integer('height'),
  animated: integer('animated'), // 动画帧数
  // 传送门相关（如果是传送门类型）
  targetMapId: varchar('target_map_id', { length: 100 }),
  targetX: integer('target_x'),
  targetY: integer('target_y'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Map = typeof maps.$inferSelect;
export type NewMap = typeof maps.$inferInsert;

export type MapTile = typeof mapTiles.$inferSelect;
export type NewMapTile = typeof mapTiles.$inferInsert;

export type MapItem = typeof mapItems.$inferSelect;
export type NewMapItem = typeof mapItems.$inferInsert;
