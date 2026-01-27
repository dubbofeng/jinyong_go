/**
 * Smart AI - 使用UCT（Upper Confidence Bound for Trees）的智能围棋AI
 * 
 * 核心改进（参考FoolGo）：
 * - UCB公式平衡探索和利用：winrate + sqrt(2 * ln(totalVisits) / nodeVisits)
 * - 哈希表缓存已探索的棋局状态
 * - 更智能的树搜索策略
 * - 适用于9路、13路棋盘
 */

import type { BoardPosition } from './go-board';
import type { GoEngine } from './go-engine';

/**
 * UCT树节点
 */
interface TreeNode {
  visits: number;
  wins: number;
  children: Map<string, TreeNode>;
  availableMoves: BoardPosition[];
}

export interface SmartAIConfig {
  simulations?: number; // 模拟次数（默认100）
  explorationConstant?: number; // UCB探索常数（默认sqrt(2)）
  timeLimit?: number; // 思考时间限制（毫秒，默认2000）
  maxCandidates?: number; // 考虑的候选点数量（默认10）
}

export interface SmartAIAnalysis {
  bestMove: BoardPosition | null;
  winrate: number;
  simulations: number;
  thinkingTime: number;
  candidates: Array<{
    position: BoardPosition;
    winrate: number;
    simulations: number;
  }>;
}

/**
 * Smart AI引擎 - UCT（Upper Confidence Bound for Trees）
 */
export class SmartAI {
  private config: Required<SmartAIConfig>;
  private transpositionTable: Map<string, TreeNode>; // 缓存棋局状态

  constructor(config: SmartAIConfig = {}) {
    this.config = {
      simulations: config.simulations ?? 100,
      explorationConstant: config.explorationConstant ?? Math.sqrt(2),
      timeLimit: config.timeLimit ?? 2000,
      maxCandidates: config.maxCandidates ?? 10,
    };
    this.transpositionTable = new Map();
  }

  /**
   * 分析当前局面，返回最佳落点
   */
  async analyzePosition(engine: GoEngine, color: 'black' | 'white'): Promise<SmartAIAnalysis> {
    const startTime = Date.now();
    
    // 1. 快速筛选候选点
    const candidates = this.selectCandidates(engine, color);
    
    if (candidates.length === 0) {
      return {
        bestMove: null,
        winrate: 0.5,
        simulations: 0,
        thinkingTime: Date.now() - startTime,
        candidates: [],
      };
    }

    // 2. 创建根节点
    const rootKey = this.getBoardKey(engine);
    let rootNode = this.transpositionTable.get(rootKey);
    if (!rootNode) {
      rootNode = {
        visits: 0,
        wins: 0,
        children: new Map(),
        availableMoves: candidates,
      };
      this.transpositionTable.set(rootKey, rootNode);
    }

    // 3. UCT搜索
    for (let i = 0; i < this.config.simulations; i++) {
      // 检查是否超时
      if (Date.now() - startTime > this.config.timeLimit) {
        break;
      }

      // 执行一次UCT迭代
      this.uctIteration(engine, color, rootNode);
    }

    // 4. 选择访问次数最多的子节点（最有信心的走法）
    let bestMove: BoardPosition | null = null;
    let maxVisits = -1;
    const results: Array<{
      position: BoardPosition;
      winrate: number;
      simulations: number;
    }> = [];

    for (const [moveKey, childNode] of Array.from(rootNode.children.entries())) {
      const position = this.parsePositionKey(moveKey);
      const winrate = childNode.visits > 0 ? childNode.wins / childNode.visits : 0;
      
      results.push({
        position,
        winrate,
        simulations: childNode.visits,
      });

      if (childNode.visits > maxVisits) {
        maxVisits = childNode.visits;
        bestMove = position;
      }
    }

    const thinkingTime = Date.now() - startTime;
    const bestChild = bestMove ? rootNode.children.get(this.getPositionKey(bestMove)) : null;
    const bestWinrate = bestChild && bestChild.visits > 0 ? bestChild.wins / bestChild.visits : 0.5;

    return {
      bestMove,
      winrate: bestWinrate,
      simulations: rootNode.visits,
      thinkingTime,
      candidates: results.sort((a, b) => b.simulations - a.simulations),
    };
  }

  /**
   * UCT迭代：选择->扩展->模拟->回传
   */
  private uctIteration(engine: GoEngine, color: 'black' | 'white', rootNode: TreeNode): void {
    const engineCopy = this.copyEngine(engine);
    let currentNode = rootNode;
    let currentColor = color;
    const path: TreeNode[] = [currentNode];

    // 1. Selection: 使用UCB选择子节点，直到叶子节点
    while (currentNode.availableMoves.length === 0 && currentNode.children.size > 0) {
      const selectedMove = this.selectBestUCB(currentNode);
      if (!selectedMove) break;

      // 执行落子
      engineCopy.placeStone(selectedMove, currentColor);
      currentColor = currentColor === 'black' ? 'white' : 'black';

      // 获取或创建子节点
      const moveKey = this.getPositionKey(selectedMove);
      let childNode = currentNode.children.get(moveKey);
      if (!childNode) {
        const candidates = this.selectCandidates(engineCopy, currentColor);
        childNode = {
          visits: 0,
          wins: 0,
          children: new Map(),
          availableMoves: candidates,
        };
        currentNode.children.set(moveKey, childNode);
      }

      currentNode = childNode;
      path.push(currentNode);
    }

    // 2. Expansion: 如果还有未尝试的落点，选择一个并扩展
    let simulationResult: number;
    if (currentNode.availableMoves.length > 0) {
      // 随机选择一个未尝试的落点
      const moveIndex = Math.floor(Math.random() * currentNode.availableMoves.length);
      const selectedMove = currentNode.availableMoves[moveIndex];
      currentNode.availableMoves.splice(moveIndex, 1);

      // 执行落子
      engineCopy.placeStone(selectedMove, currentColor);
      currentColor = currentColor === 'black' ? 'white' : 'black';

      // 创建子节点
      const candidates = this.selectCandidates(engineCopy, currentColor);
      const childNode: TreeNode = {
        visits: 0,
        wins: 0,
        children: new Map(),
        availableMoves: candidates,
      };
      currentNode.children.set(this.getPositionKey(selectedMove), childNode);
      path.push(childNode);

      // 3. Simulation: 随机走到游戏结束
      simulationResult = this.runPlayout(engineCopy, currentColor, color);
    } else {
      // 叶子节点，直接模拟
      simulationResult = this.runPlayout(engineCopy, currentColor, color);
    }

    // 4. Backpropagation: 回传结果
    for (const node of path) {
      node.visits++;
      node.wins += simulationResult;
    }
  }

  /**
   * UCB公式：选择最优子节点（平衡探索和利用）
   * UCB = winrate + explorationConstant * sqrt(ln(parentVisits) / childVisits)
   */
  private selectBestUCB(node: TreeNode): BoardPosition | null {
    let bestUCB = -Infinity;
    let bestMove: BoardPosition | null = null;

    for (const [moveKey, childNode] of Array.from(node.children.entries())) {
      if (childNode.visits === 0) {
        // 未访问的节点优先级最高
        return this.parsePositionKey(moveKey);
      }

      const winrate = childNode.wins / childNode.visits;
      const exploration = this.config.explorationConstant * Math.sqrt(Math.log(node.visits) / childNode.visits);
      const ucb = winrate + exploration;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        bestMove = this.parsePositionKey(moveKey);
      }
    }

    return bestMove;
  }

  /**
   * 选择候选落点（启发式筛选）
   */
  private selectCandidates(engine: GoEngine, color: 'black' | 'white'): BoardPosition[] {
    const boardSize = engine.getBoardSize();
    const scored: Array<{ pos: BoardPosition; score: number }> = [];

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const position: BoardPosition = { row, col };
        
        if (engine.getStoneAt(position)) {
          continue;
        }

        // 检查是否合法
        const testResult = engine.placeStoneDryRun(position, color);
        if (testResult.error) {
          continue;
        }

        // 启发式评分
        const score = this.quickEvaluate(engine, position, color);
        scored.push({ pos: position, score });
      }
    }

    // 选择评分最高的N个候选点
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, this.config.maxCandidates).map(s => s.pos);
  }

  /**
   * 快速启发式评估（用于筛选候选点）
   * 核心思想：围棋是围地的游戏，而不是简单连接
   */
  private quickEvaluate(engine: GoEngine, position: BoardPosition, color: 'black' | 'white'): number {
    let score = 30; // 降低基础分
    const opponentColor = color === 'black' ? 'white' : 'black';
    const neighbors = engine.getNeighbors(position);
    const boardSize = engine.getBoardSize();

    // ========== 紧急应对（最高优先级）==========
    
    // 1. 提子机会
    let canCapture = false;
    for (const neighbor of neighbors) {
      const stone = engine.getStoneAt(neighbor);
      if (stone === opponentColor) {
        const group = engine.getGroup(neighbor);
        const liberties = engine.countLiberties(group);
        if (liberties === 1) {
          score += 1000; // 可以提子！
          canCapture = true;
        } else if (liberties === 2) {
          score += 150; // 攻击机会
        }
      }
    }

    // 2. 救援己方
    let needRescue = false;
    for (const neighbor of neighbors) {
      const stone = engine.getStoneAt(neighbor);
      if (stone === color) {
        const group = engine.getGroup(neighbor);
        const liberties = engine.countLiberties(group);
        if (liberties === 1) {
          score += 1100; // 救命最重要！
          needRescue = true;
        } else if (liberties === 2) {
          score += 200; // 补气
        }
      }
    }

    // 如果在战斗中，其他因素次要
    if (canCapture || needRescue) {
      return score + Math.random() * 30;
    }

    // ========== 围地战略（核心）==========
    
    // 根据棋局阶段调整策略权重
    const moveCount = this.estimateMoveCount(engine);
    const totalPoints = boardSize * boardSize;
    const phase = moveCount < totalPoints * 0.2 ? 'opening' : 
                  moveCount < totalPoints * 0.6 ? 'middle' : 'endgame';
    
    // 3. 位置战略价值（序盘最重要！）
    if (phase === 'opening') {
      // 序盘：角部优先级最高
      const openingScore = this.evaluateOpeningMove(engine, position, boardSize);
      score += openingScore * 2.5; // 序盘时角部权重×2.5
      
      // 序盘时，围地能力权重降低（因为棋盘都是空的）
      const territoryScore = this.evaluateTerritory(engine, position, color);
      score += territoryScore * 0.3; // 降低权重
    } else if (phase === 'middle') {
      // 中盘：扩张和围地并重
      const territoryScore = this.evaluateTerritory(engine, position, color);
      score += territoryScore;
      
      const middleScore = this.evaluateMiddleGameMove(position, boardSize);
      score += middleScore;
    } else {
      // 官子：实地最重要
      const territoryScore = this.evaluateTerritory(engine, position, color);
      score += territoryScore * 1.2; // 提高权重
      
      const endScore = this.evaluateEndGameMove(position, boardSize);
      score += endScore;
    }

    // 4. 扩张vs侵入判断（序盘权重降低）
    const expansionValue = this.evaluateExpansion(engine, position, color, neighbors);
    score += phase === 'opening' ? expansionValue * 0.4 : expansionValue;

    // 5. 形状价值（避免愚形）
    const shapeValue = this.evaluateShape(engine, position, color, neighbors);
    score += shapeValue;

    // 6. 避免过度密集（低效率）
    const densityPenalty = this.evaluateDensity(engine, position, color, boardSize);
    score += densityPenalty;

    // 7. 小幅随机扰动
    score += Math.random() * 15;

    return score;
  }

  /**
   * 评估围地能力（核心函数）
   */
  private evaluateTerritory(engine: GoEngine, position: BoardPosition, color: 'black' | 'white'): number {
    let score = 0;
    const boardSize = engine.getBoardSize();
    const opponentColor = color === 'black' ? 'white' : 'black';
    
    // 计算这个点周围的"势力范围"（3格加权影响）
    for (let dr = -3; dr <= 3; dr++) {
      for (let dc = -3; dc <= 3; dc++) {
        if (dr === 0 && dc === 0) continue;
        
        const r = position.row + dr;
        const c = position.col + dc;
        
        if (r < 0 || r >= boardSize || c < 0 || c >= boardSize) continue;
        
        const distance = Math.abs(dr) + Math.abs(dc);
        const stone = engine.getStoneAt({ row: r, col: c });
        
        if (!stone) {
          // 空点：这是可以围住的地
          const weight = distance === 1 ? 30 : distance === 2 ? 12 : 5;
          score += weight;
        } else if (stone === color) {
          // 己方棋子：增强势力（但不要太多）
          const weight = distance === 1 ? 10 : distance === 2 ? 5 : 2;
          score += weight;
        } else {
          // 对方棋子：削弱势力
          const weight = distance === 1 ? -25 : distance === 2 ? -12 : -5;
          score += weight;
        }
      }
    }
    
    return score;
  }

  /**
   * 评估扩张价值（大场vs小场）
   */
  private evaluateExpansion(engine: GoEngine, position: BoardPosition, color: 'black' | 'white', neighbors: BoardPosition[]): number {
    let score = 0;
    const opponentColor = color === 'black' ? 'white' : 'black';
    
    let friendlyCount = 0;
    let enemyCount = 0;
    
    for (const neighbor of neighbors) {
      const stone = engine.getStoneAt(neighbor);
      if (stone === color) friendlyCount++;
      if (stone === opponentColor) enemyCount++;
    }
    
    // 在己方势力范围内扩张
    if (friendlyCount === 1 && enemyCount === 0) {
      score += 150; // 适度扩张（飞、跳）
    } else if (friendlyCount === 2 && enemyCount === 0) {
      score += 60; // 不要太紧
    }
    
    // 侵入对方势力
    if (enemyCount >= 1 && friendlyCount === 0) {
      score += 100; // 削减对方
    }
    
    // 在双方交界处（要点！）
    if (friendlyCount >= 1 && enemyCount >= 1) {
      score += 180; // 边界争夺最重要
    }
    
    // 完全孤立的位置（浪费手数）
    if (friendlyCount === 0 && enemyCount === 0) {
      score -= 40;
    }
    
    return score;
  }

  /**
   * 评估形状价值（好形vs愚形）
   */
  private evaluateShape(engine: GoEngine, position: BoardPosition, color: 'black' | 'white', neighbors: BoardPosition[]): number {
    let score = 0;
    
    let friendlyNeighbors = 0;
    const friendlyPositions: BoardPosition[] = [];
    
    for (const neighbor of neighbors) {
      if (engine.getStoneAt(neighbor) === color) {
        friendlyNeighbors++;
        friendlyPositions.push(neighbor);
      }
    }
    
    // 避免愚形：空三角
    if (friendlyNeighbors === 2) {
      const [p1, p2] = friendlyPositions;
      const isDiagonal = Math.abs(p1.row - p2.row) + Math.abs(p1.col - p2.col) === 2;
      if (!isDiagonal) {
        const thirdPos = {
          row: p1.row === position.row ? p2.row : p1.row,
          col: p1.col === position.col ? p2.col : p1.col,
        };
        if (engine.getStoneAt(thirdPos) === color) {
          score -= 180; // 空三角是愚形！
        }
      }
    }
    
    // 好形：轻盈的跳、飞（1个邻居）
    if (friendlyNeighbors === 1) {
      score += 80;
    }
    
    // 避免过度连接（太重，效率低）
    if (friendlyNeighbors >= 3) {
      score -= 120;
    }
    
    return score;
  }

  /**
   * 评估序盘落点（金角银边草肚皮）
   */
  private evaluateOpeningMove(engine: GoEngine, position: BoardPosition, boardSize: number): number {
    let score = 0;
    
    // 角的价值最高（星位最佳）
    const row = position.row;
    const col = position.col;
    
    // 检查是否是星位（3-3、3-4、4-4等标准开局点）
    const is33 = (row === 2 || row === boardSize - 3) && (col === 2 || col === boardSize - 3);
    const is34 = (row === 2 || row === boardSize - 3) && (col === 3 || col === boardSize - 4);
    const is43 = (row === 3 || row === boardSize - 4) && (col === 2 || col === boardSize - 3);
    const is44 = (row === 3 || row === boardSize - 4) && (col === 3 || col === boardSize - 4);
    
    if (is44) {
      score += 500; // 星位（4-4）：最常用的开局点
    } else if (is34 || is43) {
      score += 450; // 小目（3-4）
    } else if (is33) {
      score += 400; // 三三（3-3）
    } else {
      // 通用角部评估
      const distToNearestCorner = Math.min(
        position.row + position.col,
        position.row + (boardSize - 1 - position.col),
        (boardSize - 1 - position.row) + position.col,
        (boardSize - 1 - position.row) + (boardSize - 1 - position.col)
      );
      
      if (distToNearestCorner <= 2) {
        score += 300; // 角部附近
      } else if (distToNearestCorner <= 4) {
        score += 150; // 边部
      } else if (distToNearestCorner <= 6) {
        score += 50; // 靠近边部
      } else {
        score -= 200; // 中腹太早不好
      }
    }
    
    return score;
  }

  /**
   * 评估中盘落点
   */
  private evaluateMiddleGameMove(position: BoardPosition, boardSize: number): number {
    const isEdge = position.row === 0 || position.row === boardSize - 1 ||
                   position.col === 0 || position.col === boardSize - 1;
    
    return isEdge ? 90 : 40; // 边部仍有价值
  }

  /**
   * 评估官子落点
   */
  private evaluateEndGameMove(position: BoardPosition, boardSize: number): number {
    const isEdge = position.row === 0 || position.row === boardSize - 1 ||
                   position.col === 0 || position.col === boardSize - 1;
    
    return isEdge ? 130 : 20; // 边角收官最大
  }

  /**
   * 评估密度（避免过密）
   */
  private evaluateDensity(engine: GoEngine, position: BoardPosition, color: 'black' | 'white', boardSize: number): number {
    let nearbyStones = 0;
    
    // 检查2格范围内的己方棋子
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = position.row + dr;
        const c = position.col + dc;
        if (r >= 0 && r < boardSize && c >= 0 && c < boardSize) {
          if (engine.getStoneAt({ row: r, col: c }) === color) {
            nearbyStones++;
          }
        }
      }
    }
    
    // 太密集扣分
    if (nearbyStones > 6) {
      return -250; // 严重过密
    } else if (nearbyStones > 4) {
      return -120; // 有点密
    }
    
    return 0;
  }

  /**
   * 估计当前手数
   */
  private estimateMoveCount(engine: GoEngine): number {
    const boardSize = engine.getBoardSize();
    let count = 0;
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (engine.getStoneAt({ row, col })) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * 智能playout（轻量级启发式，非完全随机）
   * 参考FoolGo思路：避免明显坏棋，倾向基本好形
   */
  private runPlayout(engine: GoEngine, startColor: 'black' | 'white', myColor: 'black' | 'white'): number {
    const maxMoves = 200;
    let moveCount = 0;
    let consecutivePasses = 0;
    let color = startColor;

    while (moveCount < maxMoves && consecutivePasses < 2) {
      // 获取所有合法候选点（带权重）
      const weightedMoves = this.getWeightedPlayoutMoves(engine, color);
      
      if (weightedMoves.length === 0) {
        consecutivePasses++;
        color = color === 'black' ? 'white' : 'black';
        moveCount++;
        continue;
      }

      // 根据权重随机选择
      const move = this.weightedRandomChoice(weightedMoves);

      // 执行落子
      const result = engine.placeStone(move, color);
      if (!result.error) {
        consecutivePasses = 0;
      } else {
        consecutivePasses++;
      }

      color = color === 'black' ? 'white' : 'black';
      moveCount++;
    }

    // Territory-based评估（参考FoolGo的GetRegionRatio/BlackRegion方法）
    const boardSize = engine.getBoardSize();
    const territory = this.evaluateTerritoryControl(engine);
    
    // 计算黑方领地比例（棋子+影响力）
    const blackRatio = territory.black / (boardSize * boardSize);
    const whiteRatio = territory.white / (boardSize * boardSize);
    
    // 加上贴目影响（7.5子约等于8%的棋盘）
    const komiEffect = 7.5 / (boardSize * boardSize);
    const adjustedWhiteRatio = whiteRatio + komiEffect;
    
    // 返回AI的胜率
    if (myColor === 'black') {
      return blackRatio > adjustedWhiteRatio ? 1 : 0;
    } else {
      return adjustedWhiteRatio > blackRatio ? 1 : 0;
    }
  }

  /**
   * 评估棋盘上的领地控制（类似FoolGo的BlackRegion）
   * 计算每个点的归属（棋子+周围影响力）
   */
  private evaluateTerritoryControl(engine: GoEngine): { black: number; white: number } {
    const boardSize = engine.getBoardSize();
    let black = 0;
    let white = 0;

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const pos = { row, col };
        const stone = engine.getStoneAt(pos);

        if (stone === 'black') {
          black++;
        } else if (stone === 'white') {
          white++;
        } else {
          // 空点：根据周围影响力判断归属
          const influence = this.getPointInfluence(engine, pos);
          if (influence > 0.3) {
            black += influence;
          } else if (influence < -0.3) {
            white += Math.abs(influence);
          }
          // [-0.3, 0.3]范围内的点算中立
        }
      }
    }

    return { black, white };
  }

  /**
   * 计算某个空点的势力归属
   * 返回值：>0表示黑方势力，<0表示白方势力
   */
  private getPointInfluence(engine: GoEngine, position: BoardPosition): number {
    let blackInfluence = 0;
    let whiteInfluence = 0;

    // 检查周围3格内的棋子
    for (let dr = -3; dr <= 3; dr++) {
      for (let dc = -3; dc <= 3; dc++) {
        if (dr === 0 && dc === 0) continue;

        const r = position.row + dr;
        const c = position.col + dc;
        const boardSize = engine.getBoardSize();

        if (r < 0 || r >= boardSize || c < 0 || c >= boardSize) continue;

        const stone = engine.getStoneAt({ row: r, col: c });
        if (!stone) continue;

        const distance = Math.abs(dr) + Math.abs(dc);
        const weight = 1 / (distance * distance); // 距离平方衰减

        if (stone === 'black') {
          blackInfluence += weight;
        } else {
          whiteInfluence += weight;
        }
      }
    }

    // 归一化到[-1, 1]
    const total = blackInfluence + whiteInfluence;
    if (total === 0) return 0;
    return (blackInfluence - whiteInfluence) / total;
  }

  /**
   * 获取playout用的加权候选点
   * 规则：1) 可提子优先 2) 救援己方 3) 避免填眼 4) 其他合法点
   */
  private getWeightedPlayoutMoves(engine: GoEngine, color: 'black' | 'white'): Array<{ pos: BoardPosition; weight: number }> {
    const boardSize = engine.getBoardSize();
    const weighted: Array<{ pos: BoardPosition; weight: number }> = [];
    const opponentColor = color === 'black' ? 'white' : 'black';

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const position: BoardPosition = { row, col };
        
        if (engine.getStoneAt(position)) {
          continue;
        }

        // 检查是否合法
        const testResult = engine.placeStoneDryRun(position, color);
        if (testResult.error) {
          continue;
        }

        let weight = 1; // 默认权重
        const neighbors = engine.getNeighbors(position);

        // 1. 提子机会（最高优先级）
        for (const neighbor of neighbors) {
          const stone = engine.getStoneAt(neighbor);
          if (stone === opponentColor) {
            const group = engine.getGroup(neighbor);
            const liberties = engine.countLiberties(group);
            if (liberties === 1) {
              weight = 100; // 可以提子！
              break;
            }
          }
        }

        // 2. 救援己方（次高优先级）
        if (weight === 1) {
          for (const neighbor of neighbors) {
            const stone = engine.getStoneAt(neighbor);
            if (stone === color) {
              const group = engine.getGroup(neighbor);
              const liberties = engine.countLiberties(group);
              if (liberties === 1) {
                weight = 50; // 救自己！
                break;
              } else if (liberties === 2) {
                weight = 10; // 增加气数
              }
            }
          }
        }

        // 3. 避免填眼（除非是紧急情况）
        if (weight < 10 && this.isLikelyEye(engine, position, color)) {
          weight = 0.1; // 大幅降低权重，但不完全禁止
        }

        // 4. 靠近己方棋子（轻微加权）
        if (weight === 1) {
          let friendlyNeighbors = 0;
          for (const neighbor of neighbors) {
            if (engine.getStoneAt(neighbor) === color) {
              friendlyNeighbors++;
            }
          }
          if (friendlyNeighbors > 0) {
            weight = 2 + friendlyNeighbors;
          }
        }

        weighted.push({ pos: position, weight });
      }
    }

    return weighted;
  }

  /**
   * 检测是否可能是眼位（简化版eye detection）
   * 真眼：四周（斜角至少3个）都是己方棋子
   */
  private isLikelyEye(engine: GoEngine, position: BoardPosition, color: 'black' | 'white'): boolean {
    const neighbors = engine.getNeighbors(position);
    let friendlyCount = 0;
    let opponentCount = 0;
    const opponentColor = color === 'black' ? 'white' : 'black';

    // 检查四周
    for (const neighbor of neighbors) {
      const stone = engine.getStoneAt(neighbor);
      if (stone === color) {
        friendlyCount++;
      } else if (stone === opponentColor) {
        opponentCount++
      }
    }

    // 如果四周都是己方或边界，可能是眼
    if (opponentCount > 0) return false;
    
    // 至少3个邻居是己方
    if (friendlyCount >= 3) {
      // 检查斜角
      const boardSize = engine.getBoardSize();
      const diagonals = [
        { row: position.row - 1, col: position.col - 1 },
        { row: position.row - 1, col: position.col + 1 },
        { row: position.row + 1, col: position.col - 1 },
        { row: position.row + 1, col: position.col + 1 },
      ];

      let diagonalFriendly = 0;
      let diagonalOpponent = 0;

      for (const diag of diagonals) {
        if (diag.row < 0 || diag.row >= boardSize || diag.col < 0 || diag.col >= boardSize) {
          diagonalFriendly++; // 边界算己方
          continue;
        }
        const stone = engine.getStoneAt(diag);
        if (stone === color) {
          diagonalFriendly++;
        } else if (stone === opponentColor) {
          diagonalOpponent++;
        }
      }

      // 真眼判断：斜角至多1个对方棋子
      return diagonalOpponent <= 1;
    }

    return false;
  }

  /**
   * 根据权重随机选择
   */
  private weightedRandomChoice(weighted: Array<{ pos: BoardPosition; weight: number }>): BoardPosition {
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of weighted) {
      random -= item.weight;
      if (random <= 0) {
        return item.pos;
      }
    }

    // 后备方案
    return weighted[weighted.length - 1].pos;
  }

  /**
   * 复制引擎状态
   */
  private copyEngine(engine: GoEngine): GoEngine {
    const boardSize = engine.getBoardSize();
    const newEngine = new (engine.constructor as any)(boardSize);
    
    // 复制棋盘状态
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const stone = engine.getStoneAt({ row, col });
        if (stone) {
          newEngine.placeStone({ row, col }, stone);
        }
      }
    }
    
    return newEngine;
  }

  /**
   * 获取棋盘状态的哈希键
   */
  private getBoardKey(engine: GoEngine): string {
    const boardSize = engine.getBoardSize();
    let key = '';
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const stone = engine.getStoneAt({ row, col });
        key += stone === 'black' ? 'B' : stone === 'white' ? 'W' : '.';
      }
    }
    return key;
  }

  /**
   * 获取位置的键
   */
  private getPositionKey(position: BoardPosition): string {
    return `${position.row},${position.col}`;
  }

  /**
   * 解析位置键
   */
  private parsePositionKey(key: string): BoardPosition {
    const [row, col] = key.split(',').map(Number);
    return { row, col };
  }
}

/**
 * 创建默认的Smart AI实例
 */
export function createSmartAI(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): SmartAI {
  const configs = {
    easy: {
      simulations: 100,
      explorationConstant: Math.sqrt(2),
      timeLimit: 1500,
      maxCandidates: 8,
    },
    medium: {
      simulations: 200,
      explorationConstant: Math.sqrt(2),
      timeLimit: 2500,
      maxCandidates: 12,
    },
    hard: {
      simulations: 400,
      explorationConstant: Math.sqrt(2),
      timeLimit: 4000,
      maxCandidates: 15,
    },
  };

  return new SmartAI(configs[difficulty]);
}
