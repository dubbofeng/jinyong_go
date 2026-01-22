// 游戏相关类型定义

// 棋子颜色
export type StoneColor = 'black' | 'white';

// 棋盘尺寸
export type BoardSize = 9 | 13 | 19;

// 对战结果
export type GameResult = 'win' | 'loss' | 'draw';

// 对手类型
export type OpponentType = 'ai' | 'player';

// 棋步
export interface Move {
  x: number;
  y: number;
  color: StoneColor;
}

// 技能
export interface Skill {
  id: string;
  name: string;
  description: string;
  icon?: string;
  maxUses?: number;
  cooldown?: number;
}

// 技能使用记录
export interface SkillUsage {
  skill: string;
  step: number;
}

// 玩家信息
export interface PlayerInfo {
  id: number;
  username: string;
  level: number;
  experience: number;
  totalGames: number;
  wins: number;
  losses: number;
}

// 对战配置
export interface GameConfig {
  boardSize: BoardSize;
  difficulty: number;
  opponentType: OpponentType;
  opponentName: string;
  playerColor: StoneColor;
}

// 任务类型
export type QuestType = 'main' | 'side' | 'tutorial';

// 任务状态
export type QuestStatus = 'available' | 'in-progress' | 'completed';

// 任务
export interface QuestData {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  chapter: number;
  status: QuestStatus;
  requirements: any;
  rewards: {
    experience?: number;
    skills?: string[];
    items?: string[];
  };
}

// NPC类型
export type NPCType = 'teacher' | 'opponent' | 'merchant' | 'guide';

// NPC数据
export interface NPCData {
  id: string;
  name: string;
  description: string;
  type: NPCType;
  mapId: string;
  position: { x: number; y: number };
  dialogues: Record<string, string>;
  difficulty?: number;
  teachableSkills?: string[];
}

// 地图信息
export interface MapInfo {
  id: string;
  name: string;
  description: string;
  npcs: NPCData[];
}
