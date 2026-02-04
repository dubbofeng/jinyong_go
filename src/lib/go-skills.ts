/**
 * 围棋武侠技能系统
 * 
 * 九个基础技能：
 * 1. 亢龙有悔（郭靖）- 悔棋
 * 2. 独孤九剑（令狐冲）- 形势判断
 * 3. 腹语传音（虚竹）- AI建议
 * 4. 机关算尽（黄蓉）- 变化图
 * 5. 棋子暗器（陈家洛）- 打歪对手刚下的棋子
 * 6. 乾坤大挪移（张无忌）- 交换上一手黑白棋子位置
 * 7. 一阳指（ 一灯大师）- 限制对手落子区域
 * 8. 左右互搏（周伯通）- 连下两手
 * 9. 北冥神功（段誉）- 恢复内力并清除技能冷却
 */

import type { GoEngine } from './go-engine';
import type { StoneColor, BoardPosition } from './go-board';
import { SKILL_DEFINITIONS } from '../data/skill-definitions';

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
  qiCost: number; // 内力消耗
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
  id = SKILL_DEFINITIONS.kanglong_youhui.id;
  name = SKILL_DEFINITIONS.kanglong_youhui.name;
  nameEn = SKILL_DEFINITIONS.kanglong_youhui.nameEn;
  character = SKILL_DEFINITIONS.kanglong_youhui.character;
  description = SKILL_DEFINITIONS.kanglong_youhui.description;
  qiCost = SKILL_DEFINITIONS.kanglong_youhui.baseQiCost;
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
  id = SKILL_DEFINITIONS.dugu_jiujian.id;
  name = SKILL_DEFINITIONS.dugu_jiujian.name;
  nameEn = SKILL_DEFINITIONS.dugu_jiujian.nameEn;
  character = SKILL_DEFINITIONS.dugu_jiujian.character;
  description = SKILL_DEFINITIONS.dugu_jiujian.description;
  qiCost = SKILL_DEFINITIONS.dugu_jiujian.baseQiCost;
  maxUses: number;
  currentUses: number;
  
  constructor(maxUses: number = 5) {
    this.maxUses = maxUses;
    this.currentUses = maxUses;
  }

  /**
   * 使用技能：评估当前局势（使用KataGo）
   */
  async use(engine: GoEngine): Promise<TerritoryEvaluation | null> {
    if (this.currentUses <= 0) {
      return null;
    }

    const evaluation = await this.evaluateTerritory(engine);
    if (evaluation) {
      this.currentUses--;
    }
    return evaluation;
  }

  /**
   * 评估地盘和优势（使用KataGo分析）
   */
  private async evaluateTerritory(engine: GoEngine): Promise<TerritoryEvaluation | null> {
    try {
      // 使用KataGo的分析功能
      const katagoEngine = (engine as any).katagoEngine;
      if (!katagoEngine) {
        // 如果没有KataGo，使用简单评估
        return this.simpleEvaluation(engine);
      }

      // 获取当前局面的KataGo评估
      const analysis = await katagoEngine.analyze();
      
      if (!analysis) {
        return this.simpleEvaluation(engine);
      }

      // 从KataGo分析中获取信息
      const winrate = analysis.rootInfo?.winrate || 0.5;
      const scoreLead = analysis.rootInfo?.scoreLead || 0;
      
      // 计算实际地盘
      const { blackTerritory, whiteTerritory } = engine.countTerritory();
      const blackCaptures = engine.getCapturedCount('black');
      const whiteCaptures = engine.getCapturedCount('white');

      // 根据胜率判断优势
      let advantage: 'black' | 'white' | 'even';
      let evaluation: string;
      
      if (Math.abs(winrate - 0.5) < 0.05) {
        advantage = 'even';
        evaluation = '局势均衡，难分伯仲';
      } else if (winrate > 0.5) {
        advantage = 'black';
        if (winrate > 0.75) {
          evaluation = `黑棋大优，胜率${(winrate * 100).toFixed(1)}%`;
        } else if (winrate > 0.6) {
          evaluation = `黑棋优势明显，胜率${(winrate * 100).toFixed(1)}%`;
        } else {
          evaluation = `黑棋略有优势，胜率${(winrate * 100).toFixed(1)}%`;
        }
      } else {
        advantage = 'white';
        const whiteWinrate = (1 - winrate) * 100;
        if (winrate < 0.25) {
          evaluation = `白棋大优，胜率${whiteWinrate.toFixed(1)}%`;
        } else if (winrate < 0.4) {
          evaluation = `白棋优势明显，胜率${whiteWinrate.toFixed(1)}%`;
        } else {
          evaluation = `白棋略有优势，胜率${whiteWinrate.toFixed(1)}%`;
        }
      }

      return {
        blackTerritory,
        whiteTerritory,
        blackCaptures,
        whiteCaptures,
        advantage,
        score: Math.round(scoreLead),
        evaluation
      };
    } catch (error) {
      console.error('KataGo分析失败:', error);
      return this.simpleEvaluation(engine);
    }
  }

  /**
   * 简单评估（备用方案）
   */
  private simpleEvaluation(engine: GoEngine): TerritoryEvaluation {
    const { blackTerritory, whiteTerritory } = engine.countTerritory();
    const blackCaptures = engine.getCapturedCount('black');
    const whiteCaptures = engine.getCapturedCount('white');

    const blackScore = blackTerritory + blackCaptures;
    const whiteScore = whiteTerritory + whiteCaptures;
    const score = blackScore - whiteScore;

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
  id = SKILL_DEFINITIONS.fuyu_chuanyin.id;
  name = SKILL_DEFINITIONS.fuyu_chuanyin.name;
  nameEn = SKILL_DEFINITIONS.fuyu_chuanyin.nameEn;
  character = SKILL_DEFINITIONS.fuyu_chuanyin.character;
  description = SKILL_DEFINITIONS.fuyu_chuanyin.description;
  qiCost = SKILL_DEFINITIONS.fuyu_chuanyin.baseQiCost;
  maxUses: number;
  currentUses: number;
  
  constructor(maxUses: number = 3) {
    this.maxUses = maxUses;
    this.currentUses = maxUses;
  }

  /**
   * 使用技能：获取AI建议（使用KataGo）
   */
  async use(engine: GoEngine, currentPlayer: StoneColor): Promise<SuggestedMove[] | null> {
    if (this.currentUses <= 0) {
      return null;
    }

    const suggestions = await this.calculateBestMoves(engine, currentPlayer);
    if (suggestions && suggestions.length > 0) {
      this.currentUses--;
    }
    return suggestions;
  }

  /**
   * 计算最佳落点（使用KataGo分析）
   */
  private async calculateBestMoves(engine: GoEngine, color: StoneColor): Promise<SuggestedMove[]> {
    try {
      // 使用KataGo的分析功能
      const katagoEngine = (engine as any).katagoEngine;
      if (!katagoEngine) {
        // 如果没有KataGo，使用简单规则
        return this.simpleSuggestions(engine, color);
      }

      // 获取KataGo的推荐着法
      const analysis = await katagoEngine.analyze();
      
      if (!analysis || !analysis.moveInfos || analysis.moveInfos.length === 0) {
        return this.simpleSuggestions(engine, color);
      }

      // 转换KataGo的推荐为我们的格式
      const suggestions: SuggestedMove[] = [];
      const topMoves = analysis.moveInfos.slice(0, 3);

      for (const moveInfo of topMoves) {
        const position = this.convertKataGoMove(moveInfo.move, engine.getBoardSize());
        if (!position) continue;

        const winrate = moveInfo.winrate || 0.5;
        const scoreLead = moveInfo.scoreLead || 0;
        const visits = moveInfo.visits || 0;

        // 计算分数（基于访问次数和胜率）
        const score = Math.round(winrate * 100 + visits / 100);

        // 生成推荐理由
        let reason = '';
        if (winrate > 0.6) {
          reason = `胜率${(winrate * 100).toFixed(1)}%，优势手`;
        } else if (winrate > 0.5) {
          reason = `胜率${(winrate * 100).toFixed(1)}%，稳健`;
        } else {
          reason = `胜率${(winrate * 100).toFixed(1)}%`;
        }

        if (Math.abs(scoreLead) > 5) {
          reason += `，${scoreLead > 0 ? '领先' : '落后'}${Math.abs(scoreLead).toFixed(1)}目`;
        }

        suggestions.push({
          position,
          score,
          reason
        });
      }

      return suggestions;
    } catch (error) {
      console.error('KataGo分析失败:', error);
      return this.simpleSuggestions(engine, color);
    }
  }

  /**
   * 转换KataGo的着法格式
   */
  private convertKataGoMove(move: string, boardSize: number): BoardPosition | null {
    if (!move || move === 'pass') return null;

    // KataGo格式: "D4", "Q16" 等
    const col = move.charCodeAt(0) - 65; // A=0, B=1...
    const row = boardSize - parseInt(move.substring(1));

    if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) {
      return null;
    }

    return { row, col };
  }

  /**
   * 简单推荐（备用方案）
   */
  private simpleSuggestions(engine: GoEngine, color: StoneColor): SuggestedMove[] {
    const boardSize = engine.getBoardSize();
    const candidates: SuggestedMove[] = [];

    // 遍历所有空位，评估每个位置的价值
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const position: BoardPosition = { row, col };
        
        if (engine.getStoneAt(position)) {
          continue;
        }

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

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 3);
  }

  /**
   * 评估位置价值（简化版本）
   */
  private evaluatePosition(engine: GoEngine, position: BoardPosition, color: StoneColor): number {
    let score = 0;

    const opponentColor = color === 'black' ? 'white' : 'black';
    const neighbors = engine.getNeighbors(position);
    
    for (const neighbor of neighbors) {
      const stone = engine.getStoneAt(neighbor);
      if (stone === opponentColor) {
        const group = engine.getGroup(neighbor);
        const liberties = engine.countLiberties(group);
        
        if (liberties === 1) {
          score += 50;
        } else if (liberties === 2) {
          score += 25;
        }
      }
    }

    for (const neighbor of neighbors) {
      const stone = engine.getStoneAt(neighbor);
      if (stone === color) {
        const group = engine.getGroup(neighbor);
        const liberties = engine.countLiberties(group);
        
        if (liberties <= 2) {
          score += 30;
        }
      }
    }

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

    const emptyNeighbors = neighbors.filter(n => !engine.getStoneAt(n));
    score += emptyNeighbors.length * 2;
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
  id = SKILL_DEFINITIONS.jiguan_suanjin.id;
  name = SKILL_DEFINITIONS.jiguan_suanjin.name;
  nameEn = SKILL_DEFINITIONS.jiguan_suanjin.nameEn;
  character = SKILL_DEFINITIONS.jiguan_suanjin.character;
  description = SKILL_DEFINITIONS.jiguan_suanjin.description;
  qiCost = SKILL_DEFINITIONS.jiguan_suanjin.baseQiCost;
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

// ==================== 技能5：棋子暗器（打歪棋子）====================

/**
 * 棋子暗器技能
 * 效果：将对手刚下的棋子打歪到随机空位（无视合法性）
 */
export class QiZiAnQiSkill implements Skill {
  id = SKILL_DEFINITIONS.qizi_anqi.id;
  name = SKILL_DEFINITIONS.qizi_anqi.name;
  nameEn = SKILL_DEFINITIONS.qizi_anqi.nameEn;
  character = SKILL_DEFINITIONS.qizi_anqi.character;
  description = SKILL_DEFINITIONS.qizi_anqi.description;
  qiCost = SKILL_DEFINITIONS.qizi_anqi.baseQiCost;
  maxUses: number;
  currentUses: number;
  cooldown: number;
  currentCooldown: number;

  constructor(maxUses: number = 1, cooldown: number = 20) {
    this.maxUses = maxUses;
    this.currentUses = maxUses;
    this.cooldown = cooldown;
    this.currentCooldown = 0;
  }

  use(engine: GoEngine, currentPlayer: StoneColor): { from: BoardPosition; to: BoardPosition; color: StoneColor } | null {
    if (this.currentUses <= 0 || this.currentCooldown > 0) {
      return null;
    }

    const lastMove = engine.getLastMove();
    if (!lastMove) {
      return null;
    }

    const opponentColor: StoneColor = currentPlayer === 'black' ? 'white' : 'black';
    if (lastMove.color !== opponentColor) {
      return null;
    }

    const boardSize = engine.getBoardSize();
    const emptyPositions: BoardPosition[] = [];

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const position = { row, col };
        if (!engine.getStoneAt(position)) {
          emptyPositions.push(position);
        }
      }
    }

    if (emptyPositions.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * emptyPositions.length);
    const to = emptyPositions[randomIndex];
    const from = lastMove.position;

    const moved = engine.relocateStone(from, to);
    if (!moved) {
      return null;
    }

    this.currentUses--;
    this.currentCooldown = this.cooldown;

    return { from, to, color: lastMove.color };
  }

  updateCooldown(): void {
    if (this.currentCooldown > 0) {
      this.currentCooldown--;
    }
  }

  reset() {
    this.currentUses = this.maxUses;
    this.currentCooldown = 0;
  }

  canUse(): boolean {
    return this.currentUses > 0 && this.currentCooldown === 0;
  }
}

// ==================== 技能6：乾坤大挪移（交换落子）====================

/**
 * 乾坤大挪移技能
 * 效果：交换上一手黑子与白子的位置（必须合法）
 */
export class QianKunDaNuoSkill implements Skill {
  id = SKILL_DEFINITIONS.qiankun_danuo.id;
  name = SKILL_DEFINITIONS.qiankun_danuo.name;
  nameEn = SKILL_DEFINITIONS.qiankun_danuo.nameEn;
  character = SKILL_DEFINITIONS.qiankun_danuo.character;
  description = SKILL_DEFINITIONS.qiankun_danuo.description;
  qiCost = SKILL_DEFINITIONS.qiankun_danuo.baseQiCost;
  maxUses: number;
  currentUses: number;
  cooldown: number;
  currentCooldown: number;

  constructor(maxUses: number = 1, cooldown: number = 50) {
    this.maxUses = maxUses;
    this.currentUses = maxUses;
    this.cooldown = cooldown;
    this.currentCooldown = 0;
  }

  use(engine: GoEngine): {
    black: { from: BoardPosition; to: BoardPosition };
    white: { from: BoardPosition; to: BoardPosition };
  } | null {
    if (this.currentUses <= 0 || this.currentCooldown > 0) {
      return null;
    }

    const history = engine.getMoveHistory();
    if (history.length < 2) {
      return null;
    }

    const lastMove = history[history.length - 1];
    const prevMove = history[history.length - 2];
    const lastColor = lastMove.color;
    const prevColor = prevMove.color;
    const isPlayableColor = (color: StoneColor): color is 'black' | 'white' => color === 'black' || color === 'white';

    if (!isPlayableColor(lastColor) || !isPlayableColor(prevColor)) {
      return null;
    }

    if (lastColor === prevColor) {
      return null;
    }

    const blackMove = lastColor === 'black' ? lastMove : prevMove;
    const whiteMove = lastColor === 'white' ? lastMove : prevMove;

    const undoLast = engine.undo();
    const undoPrev = engine.undo();
    if (!undoLast || !undoPrev) {
      if (undoLast) {
        engine.placeStone(lastMove.position, lastColor);
      }
      return null;
    }

    const firstMove = prevMove;
    const secondMove = lastMove;
    const firstNewPosition = firstMove.color === 'black' ? whiteMove.position : blackMove.position;
    const secondNewPosition = secondMove.color === 'black' ? whiteMove.position : blackMove.position;

    const firstColor = firstMove.color === 'black' ? 'black' : 'white';
    const secondColor = secondMove.color === 'black' ? 'black' : 'white';
    const firstResult = engine.placeStone(firstNewPosition, firstColor);
    if (!firstResult.success) {
      engine.placeStone(prevMove.position, prevColor);
      engine.placeStone(lastMove.position, lastColor);
      return null;
    }

    const secondResult = engine.placeStone(secondNewPosition, secondColor);
    if (!secondResult.success) {
      engine.undo();
      engine.placeStone(prevMove.position, prevColor);
      engine.placeStone(lastMove.position, lastColor);
      return null;
    }

    this.currentUses--;
    this.currentCooldown = this.cooldown;

    return {
      black: { from: blackMove.position, to: whiteMove.position },
      white: { from: whiteMove.position, to: blackMove.position },
    };
  }

  updateCooldown(): void {
    if (this.currentCooldown > 0) {
      this.currentCooldown--;
    }
  }

  reset() {
    this.currentUses = this.maxUses;
    this.currentCooldown = 0;
  }

  canUse(): boolean {
    return this.currentUses > 0 && this.currentCooldown === 0;
  }
}

// ==================== 技能7：一阳指（限制区域）====================

/**
 * 一阳指技能
 * 效果：限制对手下一手落子区域（水平/垂直分割）
 */
export class YiYangZhiSkill implements Skill {
  id = SKILL_DEFINITIONS.yiyang_zhi.id;
  name = SKILL_DEFINITIONS.yiyang_zhi.name;
  nameEn = SKILL_DEFINITIONS.yiyang_zhi.nameEn;
  character = SKILL_DEFINITIONS.yiyang_zhi.character;
  description = SKILL_DEFINITIONS.yiyang_zhi.description;
  qiCost = SKILL_DEFINITIONS.yiyang_zhi.baseQiCost;
  maxUses: number;
  currentUses: number;
  cooldown: number;
  currentCooldown: number;

  constructor(maxUses: number = 1, cooldown: number = 20) {
    this.maxUses = maxUses;
    this.currentUses = maxUses;
    this.cooldown = cooldown;
    this.currentCooldown = 0;
  }

  use(): boolean {
    if (this.currentUses <= 0 || this.currentCooldown > 0) {
      return false;
    }

    this.currentUses--;
    this.currentCooldown = this.cooldown;
    return true;
  }

  updateCooldown(): void {
    if (this.currentCooldown > 0) {
      this.currentCooldown--;
    }
  }

  reset() {
    this.currentUses = this.maxUses;
    this.currentCooldown = 0;
  }

  canUse(): boolean {
    return this.currentUses > 0 && this.currentCooldown === 0;
  }
}

// ==================== 技能8：左右互搏（连下两手）====================

/**
 * 左右互搏技能
 * 效果：触发后可连下两手（本方额外一手）
 */
export class ZuoYouHuBoSkill implements Skill {
  id = SKILL_DEFINITIONS.zuoyou_hubo.id;
  name = SKILL_DEFINITIONS.zuoyou_hubo.name;
  nameEn = SKILL_DEFINITIONS.zuoyou_hubo.nameEn;
  character = SKILL_DEFINITIONS.zuoyou_hubo.character;
  description = SKILL_DEFINITIONS.zuoyou_hubo.description;
  qiCost = SKILL_DEFINITIONS.zuoyou_hubo.baseQiCost;
  maxUses: number;
  currentUses: number;
  cooldown: number;
  currentCooldown: number;

  constructor(maxUses: number = 1, cooldown: number = 10) {
    this.maxUses = maxUses;
    this.currentUses = maxUses;
    this.cooldown = cooldown;
    this.currentCooldown = 0;
  }

  use(): boolean {
    if (this.currentUses <= 0 || this.currentCooldown > 0) {
      return false;
    }

    this.currentUses--;
    this.currentCooldown = this.cooldown;
    return true;
  }

  updateCooldown(): void {
    if (this.currentCooldown > 0) {
      this.currentCooldown--;
    }
  }

  reset() {
    this.currentUses = this.maxUses;
    this.currentCooldown = 0;
  }

  canUse(): boolean {
    return this.currentUses > 0 && this.currentCooldown === 0;
  }
}

// ==================== 技能9：北冥神功（内力回复）====================

/**
 * 北冥神功技能
 * 效果：恢复内力，并清除所有技能冷却
 */
export class BeiMingShenGongSkill implements Skill {
  id = SKILL_DEFINITIONS.beiming_shengong.id;
  name = SKILL_DEFINITIONS.beiming_shengong.name;
  nameEn = SKILL_DEFINITIONS.beiming_shengong.nameEn;
  character = SKILL_DEFINITIONS.beiming_shengong.character;
  description = SKILL_DEFINITIONS.beiming_shengong.description;
  qiCost = Math.abs(SKILL_DEFINITIONS.beiming_shengong.baseQiCost);
  qiRestore = 50;
  maxUses: number;
  currentUses: number;

  constructor(maxUses: number = 1) {
    this.maxUses = maxUses;
    this.currentUses = maxUses;
  }

  use(): { qiRestore: number } | null {
    if (this.currentUses <= 0) {
      return null;
    }

    this.currentUses--;
    return { qiRestore: this.qiRestore };
  }

  reset() {
    this.currentUses = this.maxUses;
  }

  canUse(): boolean {
    return this.currentUses > 0;
  }
}

// ==================== 技能管理器 ====================

/**
 * 技能管理器
 * 统一管理六个技能
 */
export class SkillManager {
  private skills: Map<string, Skill>;
  private skillLevels: Map<string, number>;

  constructor() {
    this.skills = new Map();
    this.skillLevels = new Map();
    
    // 初始化六个技能（默认1级）
    this.initializeSkill('kanglong_youhui', 1);
    this.initializeSkill('dugu_jiujian', 1);
    this.initializeSkill('fuyu_chuanyin', 1);
    this.initializeSkill('jiguan_suanjin', 1);
    this.initializeSkill('qizi_anqi', 1);
    this.initializeSkill('qiankun_danuo', 1);
    this.initializeSkill('yiyang_zhi', 1);
    this.initializeSkill('zuoyou_hubo', 1);
    this.initializeSkill('beiming_shengong', 1);
  }
  
  /**
   * 根据等级初始化技能
   */
  private initializeSkill(skillId: string, level: number) {
    this.skillLevels.set(skillId, level);
    
    // 简化公式：等级 = 使用次数
    // Lv.1 = 1次, Lv.2 = 2次, Lv.3 = 3次, Lv.4 = 4次, Lv.5 = 5次
    switch (skillId) {
      case 'kanglong_youhui':
        this.skills.set(skillId, new KangLongYouHuiSkill(level));
        break;
      case 'dugu_jiujian':
        this.skills.set(skillId, new DuGuJiuJianSkill(level));
        break;
      case 'fuyu_chuanyin':
        this.skills.set(skillId, new FuYuChuanYinSkill(level));
        break;
      case 'jiguan_suanjin':
        this.skills.set(skillId, new JiGuanSuanJinSkill(level, 10));
        break;
      case 'qizi_anqi':
        this.skills.set(skillId, new QiZiAnQiSkill(level, 20));
        break;
      case 'qiankun_danuo':
        this.skills.set(skillId, new QianKunDaNuoSkill(level, 50));
        break;
      case 'yiyang_zhi':
        this.skills.set(skillId, new YiYangZhiSkill(level, 20));
        break;
      case 'zuoyou_hubo':
        this.skills.set(skillId, new ZuoYouHuBoSkill(level, 10));
        break;
      case 'beiming_shengong':
        this.skills.set(skillId, new BeiMingShenGongSkill(level));
        break;
    }
  }
  
  /**
   * 更新技能等级
   */
  updateSkillLevels(levels: Record<string, number>) {
    Object.entries(levels).forEach(([skillId, level]) => {
      this.initializeSkill(skillId, level);
    });
  }
  
  /**
   * 获取技能等级
   */
  getSkillLevel(skillId: string): number {
    return this.skillLevels.get(skillId) || 1;
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
    this.skills.forEach((skill) => {
      if ('updateCooldown' in skill && typeof (skill as any).updateCooldown === 'function') {
        (skill as any).updateCooldown();
      }
    });
  }

  /**
   * 清除所有技能冷却
   */
  clearAllCooldowns(): void {
    this.skills.forEach((skill) => {
      if ('currentCooldown' in skill) {
        (skill as any).currentCooldown = 0;
      }
    });
  }
}
