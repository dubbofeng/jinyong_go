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

// 地图物品实例表（装饰物、植物、建筑、NPC的地图实例）
export const mapItems = pgTable('map_items', {
  id: serial('id').primaryKey(),
  mapId: integer('map_id').notNull().references(() => maps.id),
  itemId: integer('item_id').notNull().references(() => items.id), // 引用items表
  
  // 位置（地图实例特定）
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  
  // 地图实例特定属性（可覆盖item默认值）
  dialogueId: varchar('dialogue_id', { length: 100 }), // 该实例的对话ID（同一建筑在不同地图可触发不同对话）
  questId: varchar('quest_id', { length: 100 }), // 该实例关联的任务ID
  sceneLinkMapId: varchar('scene_link_map_id', { length: 100 }), // 进入后传送到的地图ID（兼容旧的targetMapId）
  sceneLinkX: integer('scene_link_x'), // 传送后的X坐标（兼容旧的targetX）
  sceneLinkY: integer('scene_link_y'), // 传送后的Y坐标（兼容旧的targetY）
  facing: varchar('facing', { length: 20 }), // 实例朝向（可覆盖item默认朝向）
  
  // 状态（地图实例特定）
  enabled: boolean('enabled').notNull().default(true), // 是否启用（可用于任务控制）
  collected: boolean('collected').notNull().default(false), // 是否已被拣取/采集
  
  // 附加数据
  metadata: json('metadata').$type<Record<string, any>>(),
  
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

// 物品定义表（统一管理：道具、装饰物、植物、建筑等）
export const items: any = pgTable('items', {
  id: serial('id').primaryKey(),
  itemId: varchar('item_id', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }),
  description: text('description'),
  descriptionEn: text('description_en'),
  
  // 分类 - 扩展支持所有类型
  itemType: varchar('item_type', { length: 50 }).notNull(), // 'consumable'消耗品, 'material'材料, 'equipment'装备, 'quest'任务, 'decoration'装饰物, 'plant'植物, 'building'建筑
  category: varchar('category', { length: 50 }), // 子分类: 'indoor', 'outdoor', 'chinese_building', 'herb', 'tree', etc.
  rarity: varchar('rarity', { length: 20 }).notNull().default('common'), // 'common', 'uncommon', 'rare', 'epic', 'legendary'
  
  // 消耗品效果
  effects: json('effects').$type<{
    stamina?: number;
    qi?: number;
    experience?: number;
    maxStamina?: number;
    maxQi?: number;
  }>(),
  
  // 经济
  price: integer('price').notNull().default(0),
  sellPrice: integer('sell_price').notNull().default(0),
  stackable: boolean('stackable').notNull().default(true),
  maxStack: integer('max_stack').default(99),
  
  // 图像资源
  imagePath: varchar('image_path', { length: 500 }).notNull(), // 主图片路径（原iconPath）
  imageWidth: integer('image_width'), // 图片宽度（像素）
  imageHeight: integer('image_height'), // 图片高度（像素）
  
  // AI生成图片提示词
  prompt: text('prompt'), // AI图片生成提示词（英文）
  negativePrompt: text('negative_prompt'), // AI图片生成负面提示词（英文）
  
  // 地图物品属性（装饰物、植物、建筑）
  size: integer('size').notNull().default(1), // 占用格子数 (1-4)
  blocking: boolean('blocking').notNull().default(false), // 是否阻挡行走
  
  // 交互属性
  interactable: boolean('interactable').notNull().default(false), // 是否可交互
  pickable: boolean('pickable').notNull().default(false), // 是否可拣取
  pickupItemId: integer('pickup_item_id').references(() => items.id), // 拣取后获得的物品ID（自引用）
  
  // 植物特殊属性
  plantType: varchar('plant_type', { length: 20 }), // 'herb'草药, 'tree'树木, 'bamboo'竹子
  harvestable: boolean('harvestable').notNull().default(false), // 是否可采集
  harvestItemId: integer('harvest_item_id').references(() => items.id), // 采集获得的物品ID
  
  // 建筑特殊属性（注意：这些是默认值，map_items中可覆盖）
  enterable: boolean('enterable').notNull().default(false), // 是否可进入
  facing: varchar('facing', { length: 20 }).default('down'), // 默认朝向: 'up', 'down', 'left', 'right'
  doorOffsetX: integer('door_offset_x').default(0), // 门相对物品起始位置的X偏移
  doorOffsetY: integer('door_offset_y').default(0), // 门相对物品起始位置的Y偏移
  
  // 动画属性
  animated: boolean('animated').notNull().default(false), // 是否有动画
  animationPath: varchar('animation_path', { length: 500 }), // 动画帧路径
  frameCount: integer('frame_count'), // 动画帧数
  
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

// 死活题库表
export const tsumegoProblems = pgTable('tsumego_problems', {
  id: serial('id').primaryKey(),
  category: varchar('category', { length: 100 }).notNull(), // Beginner/Intermediate/Advanced/Tesuji
  collection: varchar('collection', { length: 200 }).notNull(), // 题目集名称
  fileName: varchar('file_name', { length: 200 }).notNull(), // 原始文件名
  difficulty: integer('difficulty').notNull(), // 1-10难度等级
  boardSize: integer('board_size').default(19).notNull(), // 棋盘大小
  blackStones: json('black_stones').$type<string[]>().notNull(), // 黑子位置（SGF格式）
  whiteStones: json('white_stones').$type<string[]>().notNull(), // 白子位置（SGF格式）
  solution: json('solution').$type<Array<[string, string, string, string]>>().notNull(), // 解答序列
  description: text('description'), // 题目描述
  experienceReward: integer('experience_reward').notNull(), // 经验奖励
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 玩家死活题记录表
export const playerTsumegoRecords = pgTable('player_tsumego_records', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  problemId: integer('problem_id').notNull().references(() => tsumegoProblems.id),
  solved: boolean('solved').default(false).notNull(), // 是否已解答
  attempts: integer('attempts').default(0).notNull(), // 尝试次数
  firstSolvedAt: timestamp('first_solved_at'), // 首次解答时间
  lastAttemptedAt: timestamp('last_attempted_at').defaultNow().notNull(), // 最后尝试时间
});

export type TsumegoProblem = typeof tsumegoProblems.$inferSelect;
export type NewTsumegoProblem = typeof tsumegoProblems.$inferInsert;

export type PlayerTsumegoRecord = typeof playerTsumegoRecords.$inferSelect;
export type NewPlayerTsumegoRecord = typeof playerTsumegoRecords.$inferInsert;

// 成就定义表
export const achievements = pgTable('achievements', {
  id: serial('id').primaryKey(),
  achievementId: varchar('achievement_id', { length: 100 }).notNull().unique(), // 成就唯一标识
  name: varchar('name', { length: 200 }).notNull(), // 成就名称
  nameEn: varchar('name_en', { length: 200 }).notNull(), // 英文名称
  description: text('description').notNull(), // 成就描述
  descriptionEn: text('description_en').notNull(), // 英文描述
  category: varchar('category', { length: 50 }).notNull(), // 成就分类：tsumego/combat/quest/social
  icon: varchar('icon', { length: 100 }).notNull(), // 图标emoji或路径
  requirement: json('requirement').$type<{
    type: 'solve_count' | 'solve_difficulty' | 'win_streak' | 'first_try' | 'defeat_npc';
    value: number;
    details?: Record<string, any>;
  }>().notNull(), // 成就条件
  reward: json('reward').$type<{
    experience?: number;
    coins?: number;
    silver?: number;
    items?: Array<{ itemId: number; quantity: number }>;
  }>(), // 成就奖励
  hidden: boolean('hidden').default(false).notNull(), // 是否为隐藏成就
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 玩家成就进度表
export const playerAchievements = pgTable('player_achievements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  achievementId: varchar('achievement_id', { length: 100 }).notNull(), // 关联achievements.achievementId
  unlocked: boolean('unlocked').default(false).notNull(), // 是否已解锁
  progress: integer('progress').default(0).notNull(), // 当前进度
  unlockedAt: timestamp('unlocked_at'), // 解锁时间
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;

export type PlayerAchievement = typeof playerAchievements.$inferSelect;
export type NewPlayerAchievement = typeof playerAchievements.$inferInsert;

