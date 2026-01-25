/**
 * 围棋武侠技能系统
 * 
 * 四个基础技能：
 * 1. 亢龙有悔（郭靖）- 悔棋
 * 2. 独孤九剑（令狐冲）- 形势判断
 * 3. 腹语传音（虚竹）- AI建议
 * 4. 机关算尽（黄蓉）- 变化图
 */

import type { GoEngine } from './go-engine';
import type { StoneColor, BoardPosition } from './go-board';

// ==================== 技能接口定义 ====================

/**
 * 技能基础接口
 */
export interface Skill {
  id: string;
  name: string;
  nameEn: string;
  character: string; // 关联的武侠人物
  description: string;
  maxUses: number; // 最大使用次数
  currentUses: number; // 当前剩余次数
  cooldown?: number; // 冷却步数（可选）
  currentCooldown?: number; // 当前冷却剩余步数
}

/**
 * 形势判断结果
 */
export interface TerritoryEvaluation {
  blackTerritory: number; // 黑方地盘
  whiteTerritory: number; // 白方地盘
  blackCaptures: number; // 黑方提子数
  whiteCaptures: number; // 白方提子数
  advantage: 'black' | 'white' | 'even'; // 优势方
  score: number; // 优势分数（正数=黑优，负数=白优）
  evaluation: string; // 评价文字
}

/**
 * AI建议落点
 */
export interface SuggestedMove {
  position: BoardPosition;
  score: number; // 评分（0-100）
  reason: string; // 推荐理由
}

/**
 * 变化图分支
 */
export interface Variation {
  id: string;
  name: string;
  moves: Array<{ position: BoardPosition; color: StoneColor }>; // 变化中的落子序列
  parentMoveIndex: number; // 从主线的哪一手开始变化
}

// ==================== 技能1：亢龙有悔（悔棋）====================

/**
 * 亢龙有悔技能
 * 效果：撤销最后一手棋
 */
export class KangLongYouHuiSkill implements Skill {
  id = 'kanglongyouhui';
  name = '亢龙有悔';
  nameEn = 'Regretful Dragon';
  character = '郭靖';
  description = '悔棋，撤回上一步落子';
  maxUses: number;
  currentUses: number;
  
  constructor(maxUses: number = 3) {
    this.maxUses = maxUses;
    this.currentUses = maxUses;
  }

  /**
   * 使用技能：执行悔棋
   */
  use(engine: GoEngine): boolean {
    if (this.currentUses <= 0) {
      return false;
    }

    const success = engine.undo();
    if (success) {
      this.currentUses--;
      return true;
    }
    return false;
  }

  /**
   * 重置技能（新对局）
   */
  reset() {
    this.currentUses = this.maxUses;
  }

  /**
   * 检查是否可用
   */
  canUse(engine: GoEngine): boolean {
    return this.currentUses > 0 && engine.canUndo();
  }
}

// ==================== 技能2：独孤九剑（形势判断）====================

/**
 * 独孤九剑技能
 * 效果：显示当前局势评估
 */
export class DuGuJiuJianSkill implements Skill {
  id = 'dugujiujian';
  name = '独孤九剑';
  nameEn = 'Nine Swords';
  character = '令狐冲';
  description = '形势判断，显示当前黑白优势';
  maxUses: number;
  currentUses: number;
  
  constructor(maxUses: number = 5) {
    this.maxUses = maxUses;
    this.currentUses = maxUses;
  }

  /**
   * 使用技能：评估当前局势
   */
  use(engine: GoEngine): TerritoryEvaluation | null {
    if (this.currentUses <= 0) {
      return null;
    }

    const evaluation = this.evaluateTerritory(engine);
    this.currentUses--;
    return evaluation;
  }

  /**
   * 评估地盘和优势
   */
  private evaluateTerritory(engine: GoEngine): TerritoryEvaluation {
    const { blackTerritory, whiteTerritory } = engine.countTerritory();
    const blackCaptures = engine.getCapturedCount('black');
    const whiteCaptures = engine.getCapturedCount('white');

    // 计算总分（地盘 + 提子）
    const blackScore = blackTerritory + blackCaptures;
    const whiteScore = whiteTerritory + whiteCaptures;
    const score = blackScore - whiteScore;

    // 判断优势方
    let advantage: 'black' | 'white' | 'even';
    let evaluation: string;

    if (Math.abs(score) <= 5) {
      advantage = 'even';
      evaluation = '局势均衡，难分伯仲';
    } else if (score > 0) {
      advantage = 'black';
      if (score > 20) {
        evaluation = '黑棋大优，胜券在握';
      } else if (score > 10) {
        evaluation = '黑棋优势明显';
      } else {
        evaluation = '黑棋略有优势';
      }
    } else {
      advantage = 'white';
      const absScore = Math.abs(score);
      if (absScore > 20) {
        evaluation = '白棋大优，胜券在握';
      } else if (absScore > 10) {
        evaluation = '白棋优势明显';
      } else {
        evaluation = '白棋略有优势';
      }
    }

    return {
      blackTerritory,
      whiteTerritory,
      blackCaptures,
      whiteCaptures,
      advantage,
      score,
      evaluation
    };
  }

  /**
   * 重置技能
   */
  reset() {
    this.currentUses = this.maxUses;
  }

  /**
   * 检查是否可用
   */
  canUse(): boolean {
    return this.currentUses > 0;
  }
}

// ==================== 技能3：腹语传音（AI建议）====================

/**
 * 腹语传音技能
 * 效果：显示AI推荐的最佳落点
 */
export class FuYuChuanYinSkill implements Skill {
  id = 'fuyuchuanyin';
  name = '腹语传音';
  nameEn = 'Telepathy';
  character = '虚竹';
  description = 'AI建议，显示3个最佳落点';
  maxUses: number;
  currentUses: number;
  
  constructor(maxUses: number = 3) {
    this.maxUses = maxUses;
    this.currentUses = maxUses;
  }

  /**
   * 使用技能：获取AI建议
   */
  use(engine: GoEngine, currentPlayer: StoneColor): SuggestedMove[] | null {
    if (this.currentUses <= 0) {
      return null;
    }

    const suggestions = this.calculateBestMoves(engine, currentPlayer);
    this.currentUses--;
    return suggestions;
  }

  /**
   * 计算最佳落点（简单规则引擎）
   */
  private calculateBestMoves(engine: GoEngine, color: StoneColor): SuggestedMove[] {
    const boardSize = engine.getBoardSize();
    const candidates: SuggestedMove[] = [];

    // 遍历所有空位，评估每个位置的价值
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const position: BoardPosition = { row, col };
        
        // 检查是否可以落子
        if (engine.getStoneAt(position)) {
          continue;
        }

        // 简单评分逻辑
        const score = this.evaluatePosition(engine, position, color);
        if (score > 0) {
          candidates.push({
            position,
            score,
            reason: this.getPositionReason(score)
          });
        }
      }
    }

    // 按评分排序，返回前3个
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 3);
  }

  /**
   * 评估位置价值（简化版本）
   */
  private evaluatePosition(engine: GoEngine, position: BoardPosition, color: StoneColor): number {
    let score = 0;

    // 1. 检查能否提子（高优先级）
    const opponentColor = color === 'black' ? 'white' : 'black';
    const neighbors = engine.getNeighbors(position);
    
    for (const neighbor of neighbors) {
      const stone = engine.getStoneAt(neighbor);
      if (stone === opponentColor) {
        const group = engine.getGroup(neighbor);
        const liberties = engine.countLiberties(group);
        
        // 如果对手的棋只有1气，可以提子
        if (liberties === 1) {
          score += 50;
        }
        // 如果对手的棋只有2气，可以围攻
        else if (liberties === 2) {
          score += 25;
        }
      }
    }

    // 2. 检查自己的棋是否需要补气
    for (const neighbor of neighbors) {
      const stone = engine.getStoneAt(neighbor);
      if (stone === color) {
        const group = engine.getGroup(neighbor);
        const liberties = engine.countLiberties(group);
        
        // 如果自己的棋气紧，需要补棋
        if (liberties <= 2) {
          score += 30;
        }
      }
    }

    // 3. 角和边的价值较高
    const boardSize = engine.getBoardSize();
    const isCorner = (position.row === 0 || position.row === boardSize - 1) &&
                     (position.col === 0 || position.col === boardSize - 1);
    const isEdge = position.row === 0 || position.row === boardSize - 1 ||
                   position.col === 0 || position.col === boardSize - 1;
    
    if (isCorner) {
      score += 15;
    } else if (isEdge) {
      score += 10;
    }

    // 4. 影响力：周围空点数量
    const emptyNeighbors = neighbors.filter(n => !engine.getStoneAt(n));
    score += emptyNeighbors.length * 2;

    // 5. 随机因子（避免过于机械）
    score += Math.random() * 5;

    return score;
  }

  /**
   * 根据评分返回推荐理由
   */
  private getPositionReason(score: number): string {
    if (score >= 50) {
      return '可提子！';
    } else if (score >= 30) {
      return '补气要点';
    } else if (score >= 20) {
      return '战略要地';
    } else if (score >= 15) {
      return '角部价值';
    } else {
      return '可行落点';
    }
  }

  /**
   * 重置技能
   */
  reset() {
    this.currentUses = this.maxUses;
  }

  /**
   * 检查是否可用
   */
  canUse(): boolean {
    return this.currentUses > 0;
  }
}

// ==================== 技能4：机关算尽（变化图）====================

/**
 * 机关算尽技能
 * 效果：创建变化图分支，支持试下和回放
 */
export class JiGuanSuanJinSkill implements Skill {
  id = 'jiguansuanjin';
  name = '机关算尽';
  nameEn = 'Master Strategist';
  character = '黄蓉';
  description = '变化图，试下多个可能的下法';
  maxUses: number;
  currentUses: number;
  cooldown: number;
  currentCooldown: number;
  
  private variations: Variation[] = [];
  private currentVariationId: string | null = null;

  constructor(maxUses: number = 2, cooldown: number = 10) {
    this.maxUses = maxUses;
    this.currentUses = maxUses;
    this.cooldown = cooldown;
    this.currentCooldown = 0;
  }

  /**
   * 使用技能：创建新变化分支
   */
  use(engine: GoEngine, variationName?: string): Variation | null {
    if (this.currentUses <= 0 || this.currentCooldown > 0) {
      return null;
    }

    // 创建新变化
    const variation: Variation = {
      id: `var_${Date.now()}`,
      name: variationName || `变化 ${this.variations.length + 1}`,
      moves: [],
      parentMoveIndex: engine.getMoveCount()
    };

    this.variations.push(variation);
    this.currentVariationId = variation.id;
    this.currentUses--;
    this.currentCooldown = this.cooldown;

    return variation;
  }

  /**
   * 添加落子到当前变化
   */
  addMoveToVariation(position: BoardPosition, color: StoneColor): boolean {
    if (!this.currentVariationId) {
      return false;
    }

    const variation = this.variations.find(v => v.id === this.currentVariationId);
    if (!variation) {
      return false;
    }

    variation.moves.push({ position, color });
    return true;
  }

  /**
   * 切换到指定变化
   */
  switchToVariation(variationId: string): Variation | null {
    const variation = this.variations.find(v => v.id === variationId);
    if (!variation) {
      return null;
    }

    this.currentVariationId = variationId;
    return variation;
  }

  /**
   * 返回主线（清除当前变化选择）
   */
  returnToMainLine(): void {
    this.currentVariationId = null;
  }

  /**
   * 获取所有变化
   */
  getVariations(): Variation[] {
    return this.variations;
  }

  /**
   * 获取当前变化
   */
  getCurrentVariation(): Variation | null {
    if (!this.currentVariationId) {
      return null;
    }
    return this.variations.find(v => v.id === this.currentVariationId) || null;
  }

  /**
   * 删除变化
   */
  deleteVariation(variationId: string): boolean {
    const index = this.variations.findIndex(v => v.id === variationId);
    if (index === -1) {
      return false;
    }

    this.variations.splice(index, 1);
    if (this.currentVariationId === variationId) {
      this.currentVariationId = null;
    }
    return true;
  }

  /**
   * 更新冷却（每走一步调用）
   */
  updateCooldown(): void {
    if (this.currentCooldown > 0) {
      this.currentCooldown--;
    }
  }

  /**
   * 重置技能
   */
  reset() {
    this.currentUses = this.maxUses;
    this.currentCooldown = 0;
    this.variations = [];
    this.currentVariationId = null;
  }

  /**
   * 检查是否可用
   */
  canUse(): boolean {
    return this.currentUses > 0 && this.currentCooldown === 0;
  }
}

// ==================== 技能管理器 ====================

/**
 * 技能管理器
 * 统一管理四个技能
 */
export class SkillManager {
  private skills: Map<string, Skill>;

  constructor() {
    this.skills = new Map();
    
    // 初始化四个技能
    this.skills.set('kanglongyouhui', new KangLongYouHuiSkill(3));
    this.skills.set('dugujiujian', new DuGuJiuJianSkill(5));
    this.skills.set('fuyuchuanyin', new FuYuChuanYinSkill(3));
    this.skills.set('jiguansuanjin', new JiGuanSuanJinSkill(2, 10));
  }

  /**
   * 获取技能
   */
  getSkill(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  /**
   * 获取所有技能
   */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * 重置所有技能（新对局）
   */
  resetAll(): void {
    this.skills.forEach(skill => {
      if ('reset' in skill && typeof skill.reset === 'function') {
        skill.reset();
      }
    });
  }

  /**
   * 更新冷却（每走一步后调用）
   */
  updateCooldowns(): void {
    const jiGuanSkill = this.skills.get('jiguansuanjin') as JiGuanSuanJinSkill;
    if (jiGuanSkill) {
      jiGuanSkill.updateCooldown();
    }
  }
}
