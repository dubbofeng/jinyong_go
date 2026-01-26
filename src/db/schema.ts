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
  itemType: varchar('item_type', { length: 50 }).notNull(), // 'building', 'plant', 'decoration', 'portal', 'npc'
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  width: integer('width'),
  height: integer('height'),
  animated: integer('animated'), // 动画帧数
  blocking: boolean('blocking').default(false), // 是否阻挡移动
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

// =============== 玩家成长系统 ===============

// 玩家属性表（体力、内力、等级）
export const playerStats = pgTable('player_stats', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique().references(() => users.id),
  
  // 等级属性
  level: integer('level').notNull().default(1),
  experience: integer('experience').notNull().default(0),
  experienceToNext: integer('experience_to_next').notNull().default(100),
  
  // 体力系统
  stamina: integer('stamina').notNull().default(100),
  maxStamina: integer('max_stamina').notNull().default(100),
  staminaRegenRate: integer('stamina_regen_rate').notNull().default(1), // 点/5分钟
  lastStaminaRegen: timestamp('last_stamina_regen').notNull().defaultNow(),
  
  // 内力系统
  qi: integer('qi').notNull().default(100),
  maxQi: integer('max_qi').notNull().default(100),
  qiRegenRate: integer('qi_regen_rate').notNull().default(2), // 点/5分钟
  lastQiRegen: timestamp('last_qi_regen').notNull().defaultNow(),
  
  // 货币
  coins: integer('coins').notNull().default(0),
  silver: integer('silver').notNull().default(100),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 玩家技能表（解锁、等级、使用统计）
export const playerSkills = pgTable('player_skills', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  skillId: varchar('skill_id', { length: 50 }).notNull(),
  
  // 技能状态
  unlocked: boolean('unlocked').notNull().default(false),
  level: integer('level').notNull().default(1),
  experience: integer('experience').notNull().default(0),
  
  // 解锁信息
  unlockedByQuest: varchar('unlocked_by_quest', { length: 50 }),
  unlockedAt: timestamp('unlocked_at'),
  
  // 使用统计
  timesUsed: integer('times_used').notNull().default(0),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 物品定义表（药品、道具配置）
export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  itemId: varchar('item_id', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }),
  description: text('description').notNull(),
  
  // 分类
  itemType: varchar('item_type', { length: 50 }).notNull(), // 'potion', 'material', 'equipment', 'quest'
  rarity: varchar('rarity', { length: 20 }).notNull(), // 'common', 'uncommon', 'rare', 'epic', 'legendary'
  
  // 效果
  effects: json('effects').$type<{
    stamina?: number;
    qi?: number;
    experience?: number;
    maxStamina?: number;
    maxQi?: number;
  }>().notNull(),
  
  // 经济
  price: integer('price').notNull().default(0),
  sellPrice: integer('sell_price').notNull().default(0),
  stackable: boolean('stackable').notNull().default(true),
  maxStack: integer('max_stack').default(99),
  
  // 图标
  iconPath: varchar('icon_path', { length: 200 }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 玩家背包表（持有物品）
export const playerInventory = pgTable('player_inventory', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  itemId: varchar('item_id', { length: 50 }).notNull(),
  
  // 数量
  quantity: integer('quantity').notNull().default(1),
  
  // 装备
  equipped: boolean('equipped').notNull().default(false),
  slot: varchar('slot', { length: 50 }),
  
  obtainedAt: timestamp('obtained_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 任务进度表（详细追踪）
export const questProgress = pgTable('quest_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  questId: varchar('quest_id', { length: 50 }).notNull(),
  
  // 状态
  status: varchar('status', { length: 20 }).notNull().default('not_started'), // 'not_started', 'in_progress', 'completed', 'failed'
  
  // 进度
  progress: json('progress').$type<{
    wins?: number;
    losses?: number;
    target_wins?: number;
    opponent?: string;
    [key: string]: any;
  }>().notNull().default({}),
  currentStep: integer('current_step').notNull().default(0),
  totalSteps: integer('total_steps').notNull().default(1),
  
  // 时间
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// NPC关系表（好感度、交互）
export const npcRelationships = pgTable('npc_relationships', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  npcId: varchar('npc_id', { length: 50 }).notNull(),
  
  // 好感度
  affection: integer('affection').notNull().default(0), // 0-100
  affectionLevel: varchar('affection_level', { length: 20 }).notNull().default('stranger'), // 'stranger', 'acquaintance', 'friend', 'close_friend', 'master'
  
  // 交互统计
  dialoguesCount: integer('dialogues_count').notNull().default(0),
  giftsGiven: integer('gifts_given').notNull().default(0),
  battlesWon: integer('battles_won').notNull().default(0),
  battlesLost: integer('battles_lost').notNull().default(0),
  
  // 特殊标记
  defeated: boolean('defeated').notNull().default(false), // 是否已击败（对手类NPC）
  learnedFrom: boolean('learned_from').notNull().default(false), // 是否已拜师（导师类NPC）
  
  firstMetAt: timestamp('first_met_at').defaultNow(),
  lastInteractionAt: timestamp('last_interaction_at').defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 游戏设置表（偏好配置）
export const gameSettings = pgTable('game_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique().references(() => users.id),
  
  // 语言
  language: varchar('language', { length: 10 }).notNull().default('zh'), // 'zh', 'en'
  
  // 音效
  musicVolume: integer('music_volume').notNull().default(80), // 0-100
  sfxVolume: integer('sfx_volume').notNull().default(80),
  musicEnabled: boolean('music_enabled').notNull().default(true),
  sfxEnabled: boolean('sfx_enabled').notNull().default(true),
  
  // 图形
  graphicsQuality: varchar('graphics_quality', { length: 20 }).notNull().default('high'), // 'low', 'medium', 'high'
  showCoordinates: boolean('show_coordinates').notNull().default(false),
  
  // 游戏
  autoSave: boolean('auto_save').notNull().default(true),
  autoSaveInterval: integer('auto_save_interval').notNull().default(5), // 分钟
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type PlayerStats = typeof playerStats.$inferSelect;
export type NewPlayerStats = typeof playerStats.$inferInsert;

export type PlayerSkill = typeof playerSkills.$inferSelect;
export type NewPlayerSkill = typeof playerSkills.$inferInsert;

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

export type PlayerInventoryItem = typeof playerInventory.$inferSelect;
export type NewPlayerInventoryItem = typeof playerInventory.$inferInsert;

export type QuestProgress = typeof questProgress.$inferSelect;
export type NewQuestProgress = typeof questProgress.$inferInsert;

export type NpcRelationship = typeof npcRelationships.$inferSelect;
export type NewNpcRelationship = typeof npcRelationships.$inferInsert;

export type GameSettings = typeof gameSettings.$inferSelect;
export type NewGameSettings = typeof gameSettings.$inferInsert;
