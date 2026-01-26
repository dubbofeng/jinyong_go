/**
 * 死活题类型定义
 */

export interface TsumegoProblem {
  id: number;
  category: string;
  collection: string;
  fileName: string;
  difficulty: number;
  boardSize: number;
  blackStones: string[]; // SGF格式坐标数组 ['ab', 'cd', ...]
  whiteStones: string[]; // SGF格式坐标数组
  solution: Array<[string, string, string, string]>; // [颜色, SGF坐标, 注释, 警告]
  description: string | null;
  experienceReward: number;
  createdAt: string;
}

export interface TsumegoEncounterResult {
  success: boolean;
  experienceGained: number;
  itemsDropped?: Array<{
    itemId: number;
    itemName: string;
    quantity: number;
  }>;
  coinsGained?: number;
}
