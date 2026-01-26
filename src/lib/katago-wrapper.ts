/**
 * KataGo WebAssembly 包装器
 * 
 * 提供KataGo AI引擎的浏览器端集成：
 * - WASM模块加载和初始化
 * - 围棋位置分析和最佳落点建议
 * - 性能监控和超时控制
 */

import type { BoardPosition } from './go-board';
import type { GoEngine } from './go-engine';

export interface KataGoConfig {
  modelPath: string; // 模型文件路径
  wasmPath: string; // WASM文件路径
  maxVisits?: number; // 最大搜索次数（默认100）
  timeLimit?: number; // 思考时间限制（毫秒，默认3000）
}

export interface KataGoAnalysis {
  bestMove: BoardPosition | null; // 最佳落点
  winrate: number; // 胜率（0-1）
  score: number; // 预估目数差
  visits: number; // 搜索次数
  thinkingTime: number; // 思考时间（毫秒）
}

/**
 * KataGo AI引擎包装器
 */
export class KataGoWrapper {
  private isInitialized: boolean = false;
  private isLoading: boolean = false;
  private config: KataGoConfig;
  private katagoInstance: any = null; // KataGo WASM实例

  constructor(config: KataGoConfig) {
    this.config = {
      maxVisits: 100,
      timeLimit: 3000,
      ...config,
    };
  }

  /**
   * 初始化KataGo引擎
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.isLoading) {
      throw new Error('KataGo is already loading');
    }

    this.isLoading = true;

    try {
      console.log('🤖 Initializing KataGo WASM...');
      
      // TODO: 实际加载KataGo WASM模块
      // 当前为占位符实现
      
      // 1. 加载WASM文件
      // const wasmModule = await this.loadWasmModule();
      
      // 2. 加载模型文件
      // const modelData = await this.loadModel();
      
      // 3. 初始化引擎
      // this.katagoInstance = await initKataGo(wasmModule, modelData);
      
      console.log('✅ KataGo initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize KataGo:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 分析当前局面，返回最佳落点
   */
  async analyzePosition(engine: GoEngine, color: 'black' | 'white'): Promise<KataGoAnalysis> {
    if (!this.isInitialized) {
      throw new Error('KataGo not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    try {
      console.log(`🤔 KataGo analyzing position for ${color}...`);

      // TODO: 实际调用KataGo分析
      // 当前返回占位符结果
      const result = await this.simulateAnalysis(engine, color);

      const thinkingTime = Date.now() - startTime;
      console.log(`✅ Analysis complete in ${thinkingTime}ms`);

      return {
        ...result,
        thinkingTime,
      };
    } catch (error) {
      console.error('❌ KataGo analysis failed:', error);
      throw error;
    }
  }

  /**
   * 模拟分析（用于开发测试）
   * TODO: 替换为真实的KataGo调用
   */
  private async simulateAnalysis(engine: GoEngine, color: 'black' | 'white'): Promise<Omit<KataGoAnalysis, 'thinkingTime'>> {
    // 模拟思考延迟
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    // 使用简单规则找到一个合理的落点
    const boardSize = engine.getBoardSize();
    const candidates: Array<{ pos: BoardPosition; score: number }> = [];

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const position: BoardPosition = { row, col };
        
        if (engine.getStoneAt(position)) {
          continue;
        }

        // 简单评分
        const score = this.evaluateMove(engine, position, color);
        if (score > 0) {
          candidates.push({ pos: position, score });
        }
      }
    }

    if (candidates.length === 0) {
      return {
        bestMove: null,
        winrate: 0.5,
        score: 0,
        visits: 0,
      };
    }

    // 选择评分最高的位置
    candidates.sort((a, b) => b.score - a.score);
    const bestMove = candidates[0].pos;
    
    // 模拟胜率和分数
    const winrate = 0.45 + Math.random() * 0.1; // 0.45-0.55之间
    const score = Math.random() * 10 - 5; // -5到+5之间

    return {
      bestMove,
      winrate,
      score,
      visits: this.config.maxVisits || 100,
    };
  }

  /**
   * 简单评估落点价值（强化版）
   */
  private evaluateMove(engine: GoEngine, position: BoardPosition, color: 'black' | 'white'): number {
    let score = 0;

    // 1. 检查能否提子（最高优先级）
    const opponentColor = color === 'black' ? 'white' : 'black';
    const neighbors = engine.getNeighbors(position);
    
    for (const neighbor of neighbors) {
      const stone = engine.getStoneAt(neighbor);
      if (stone === opponentColor) {
        const group = engine.getGroup(neighbor);
        const liberties = engine.countLiberties(group);
        
        if (liberties === 1) {
          score += 150; // 可以提子（提高权重）
        } else if (liberties === 2) {
          score += 80; // 围攻（打入）
        } else if (liberties === 3) {
          score += 40; // 施加压力
        }
      }
    }

    // 2. 检查自己的棋是否需要补气（救援己方）
    let maxDanger = 0;
    for (const neighbor of neighbors) {
      const stone = engine.getStoneAt(neighbor);
      if (stone === color) {
        const group = engine.getGroup(neighbor);
        const liberties = engine.countLiberties(group);
        
        if (liberties === 1) {
          maxDanger = Math.max(maxDanger, 200); // 危急！必须救
        } else if (liberties === 2) {
          maxDanger = Math.max(maxDanger, 100); // 补气要点
        } else if (liberties === 3) {
          maxDanger = Math.max(maxDanger, 50); // 加固
        }
      }
    }
    score += maxDanger;

    // 3. 扩张价值（连接和影响力）
    let friendlyCount = 0;
    let emptyCount = 0;
    for (const neighbor of neighbors) {
      const stone = engine.getStoneAt(neighbor);
      if (stone === color) {
        friendlyCount++;
      } else if (!stone) {
        emptyCount++;
      }
    }
    
    // 连接友军
    if (friendlyCount >= 2) {
      score += 70; // 强连接
    } else if (friendlyCount === 1) {
      score += 40; // 延伸
    }
    
    // 开放空间
    score += emptyCount * 15;

    // 4. 角和边价值（序盘重要）
    const boardSize = engine.getBoardSize();
    const isCorner = (position.row === 0 || position.row === boardSize - 1) &&
                     (position.col === 0 || position.col === boardSize - 1);
    const isEdge = position.row === 0 || position.row === boardSize - 1 ||
                   position.col === 0 || position.col === boardSize - 1;
    
    // 三三点（3,3）特别重要
    const isThreeThree = (position.row === 2 || position.row === boardSize - 3) &&
                         (position.col === 2 || position.col === boardSize - 3);
    
    // 星位（4,4）在9路棋盘上很重要
    const starPoints = boardSize === 9 ? [2, 4, 6] : [3, 9, 15];
    const isStarPoint = starPoints.includes(position.row) && starPoints.includes(position.col);
    
    if (isThreeThree) {
      score += 60; // 三三点
    } else if (isStarPoint) {
      score += 50; // 星位
    } else if (isCorner) {
      score += 40; // 角
    } else if (isEdge) {
      score += 25; // 边
    }

    // 5. 中心影响力（开局阶段）
    const centerRow = Math.floor(boardSize / 2);
    const centerCol = Math.floor(boardSize / 2);
    const centerDist = Math.abs(position.row - centerRow) + Math.abs(position.col - centerCol);
    
    // 天元特别加分
    if (position.row === centerRow && position.col === centerCol) {
      score += 35; // 天元
    } else {
      score += Math.max(0, (boardSize - centerDist * 2) * 3);
    }

    // 6. 避免过于密集（留下空间）
    const twoStep = this.getTwoStepNeighbors(position, boardSize);
    let nearbyStones = 0;
    for (const pos of twoStep) {
      if (engine.getStoneAt(pos)) {
        nearbyStones++;
      }
    }
    if (nearbyStones > 6) {
      score -= 30; // 过于拥挤
    }

    // 7. 棋型判断（简单模式识别）
    const pattern = this.detectPattern(engine, position, color);
    score += pattern;

    // 8. 随机因子（减少重复）
    score += Math.random() * 15;

    return score;
  }

  /**
   * 获取两步邻居（用于判断拥挤度）
   */
  private getTwoStepNeighbors(pos: BoardPosition, boardSize: number): BoardPosition[] {
    const result: BoardPosition[] = [];
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        if (dr === 0 && dc === 0) continue;
        const row = pos.row + dr;
        const col = pos.col + dc;
        if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
          result.push({ row, col });
        }
      }
    }
    return result;
  }

  /**
   * 检测简单棋型
   */
  private detectPattern(engine: GoEngine, position: BoardPosition, color: 'black' | 'white'): number {
    let patternScore = 0;
    
    // 检测小飞（Knight's move）
    const knightMoves = [
      { row: position.row - 2, col: position.col - 1 },
      { row: position.row - 2, col: position.col + 1 },
      { row: position.row + 2, col: position.col - 1 },
      { row: position.row + 2, col: position.col + 1 },
      { row: position.row - 1, col: position.col - 2 },
      { row: position.row - 1, col: position.col + 2 },
      { row: position.row + 1, col: position.col - 2 },
      { row: position.row + 1, col: position.col + 2 },
    ];
    
    for (const km of knightMoves) {
      if (km.row >= 0 && km.row < engine.getBoardSize() && 
          km.col >= 0 && km.col < engine.getBoardSize()) {
        if (engine.getStoneAt(km) === color) {
          patternScore += 25; // 小飞连接
          break;
        }
      }
    }
    
    return patternScore;
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 释放资源
   */
  dispose(): void {
    if (this.katagoInstance) {
      // TODO: 清理KataGo实例
      this.katagoInstance = null;
    }
    this.isInitialized = false;
  }
}

/**
 * 创建默认的KataGo实例
 */
export function createKataGo(): KataGoWrapper {
  return new KataGoWrapper({
    modelPath: '/katago/model.bin.gz',
    wasmPath: '/katago/katago.wasm',
    maxVisits: 100,
    timeLimit: 3000,
  });
}
