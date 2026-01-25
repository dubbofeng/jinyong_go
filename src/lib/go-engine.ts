/**
 * 围棋规则引擎
 * 实现标准围棋规则：气的计算、提子逻辑、劫争检测、死活判断
 */

import type { StoneColor, BoardPosition } from './go-board';

export interface MoveResult {
  success: boolean;
  capturedStones: BoardPosition[];
  isKo: boolean;
  error?: string;
}

export class GoEngine {
  private size: number;
  private board: StoneColor[][];
  private koPosition: BoardPosition | null = null; // 劫争位置
  private moveHistory: {
    position: BoardPosition;
    color: StoneColor;
    capturedStones: BoardPosition[];
  }[] = [];

  constructor(size: number) {
    this.size = size;
    this.board = Array(size).fill(null).map(() => Array(size).fill(null));
  }

  /**
   * 尝试落子
   */
  placeStone(position: BoardPosition, color: 'black' | 'white'): MoveResult {
    const { row, col } = position;

    // 1. 检查位置是否为空
    if (this.board[row][col] !== null) {
      return {
        success: false,
        capturedStones: [],
        isKo: false,
        error: 'Position already occupied',
      };
    }

    // 2. 检查是否违反劫争规则
    if (this.koPosition && this.koPosition.row === row && this.koPosition.col === col) {
      return {
        success: false,
        capturedStones: [],
        isKo: true,
        error: 'Ko rule violation',
      };
    }

    // 3. 临时放置棋子
    this.board[row][col] = color;

    // 4. 检查并提取对手的棋子
    const opponentColor: 'black' | 'white' = color === 'black' ? 'white' : 'black';
    const capturedStones: BoardPosition[] = [];
    const neighbors = this.getNeighbors(position);

    for (const neighbor of neighbors) {
      if (this.board[neighbor.row][neighbor.col] === opponentColor) {
        const group = this.getGroup(neighbor);
        if (this.countLiberties(group) === 0) {
          // 这个组没有气了，提取
          for (const stone of group) {
            this.board[stone.row][stone.col] = null;
            capturedStones.push(stone);
          }
        }
      }
    }

    // 5. 检查自己的气（自杀手）
    const myGroup = this.getGroup(position);
    const myLiberties = this.countLiberties(myGroup);

    if (myLiberties === 0 && capturedStones.length === 0) {
      // 自杀手且没有提子，不合法
      this.board[row][col] = null;
      return {
        success: false,
        capturedStones: [],
        isKo: false,
        error: 'Suicide move',
      };
    }

    // 6. 检查劫争
    this.koPosition = null;
    if (capturedStones.length === 1 && myGroup.length === 1) {
      // 可能是劫争：提了一子，且落子的棋子只有一个
      const capturedPos = capturedStones[0];
      this.board[capturedPos.row][capturedPos.col] = opponentColor; // 临时恢复
      const wouldBeCapture = this.countLiberties([position]) === 0;
      this.board[capturedPos.row][capturedPos.col] = null; // 再次移除

      if (wouldBeCapture) {
        // 这是劫争
        this.koPosition = capturedPos;
      }
    }

    // 7. 记录移动历史
    this.moveHistory.push({
      position,
      color,
      capturedStones: [...capturedStones],
    });

    return {
      success: true,
      capturedStones,
      isKo: false,
    };
  }

  /**
   * 获取指定位置的相邻位置（上下左右）
   */
  public getNeighbors(position: BoardPosition): BoardPosition[] {
    const { row, col } = position;
    const neighbors: BoardPosition[] = [];
    const directions = [
      [-1, 0], // 上
      [1, 0],  // 下
      [0, -1], // 左
      [0, 1],  // 右
    ];

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < this.size && newCol >= 0 && newCol < this.size) {
        neighbors.push({ row: newRow, col: newCol });
      }
    }

    return neighbors;
  }

  /**
   * 获取连通的棋子组（同色相连）
   */
  public getGroup(position: BoardPosition): BoardPosition[] {
    const color = this.board[position.row][position.col];
    if (color === null) return [];

    const group: BoardPosition[] = [];
    const visited = new Set<string>();
    const queue: BoardPosition[] = [position];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.row},${current.col}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (this.board[current.row][current.col] === color) {
        group.push(current);
        const neighbors = this.getNeighbors(current);
        queue.push(...neighbors);
      }
    }

    return group;
  }

  /**
   * 计算一组棋子的气（自由度）
   */
  public countLiberties(group: BoardPosition[]): number {
    const liberties = new Set<string>();

    for (const stone of group) {
      const neighbors = this.getNeighbors(stone);
      for (const neighbor of neighbors) {
        if (this.board[neighbor.row][neighbor.col] === null) {
          liberties.add(`${neighbor.row},${neighbor.col}`);
        }
      }
    }

    return liberties.size;
  }

  /**
   * 获取指定位置棋子的气数
   */
  getLiberties(position: BoardPosition): number {
    if (this.board[position.row][position.col] === null) {
      return 0;
    }
    const group = this.getGroup(position);
    return this.countLiberties(group);
  }

  /**
   * 获取棋盘状态
   */
  getBoard(): StoneColor[][] {
    return this.board.map(row => [...row]);
  }

  /**
   * 设置棋盘状态
   */
  setBoard(board: StoneColor[][]): void {
    if (board.length !== this.size || board[0].length !== this.size) {
      throw new Error('Invalid board size');
    }
    this.board = board.map(row => [...row]);
    this.koPosition = null;
  }

  /**
   * 获取指定位置的棋子颜色
   */
  getStone(position: BoardPosition): StoneColor {
    return this.board[position.row][position.col];
  }

  /**
   * 悔棋（撤销上一步）
   */
  undo(): boolean {
    if (this.moveHistory.length === 0) {
      return false;
    }

    const lastMove = this.moveHistory.pop()!;
    
    // 移除落子
    this.board[lastMove.position.row][lastMove.position.col] = null;
    
    // 恢复被提的子
    const opponentColor: StoneColor = lastMove.color === 'black' ? 'white' : 'black';
    for (const captured of lastMove.capturedStones) {
      this.board[captured.row][captured.col] = opponentColor;
    }
    
    // 清除劫争状态
    this.koPosition = null;
    
    return true;
  }

  /**
   * 获取移动历史
   */
  getMoveHistory() {
    return [...this.moveHistory];
  }

  /**
   * 清空棋盘
   */
  clear(): void {
    this.board = Array(this.size).fill(null).map(() => Array(this.size).fill(null));
    this.koPosition = null;
    this.moveHistory = [];
  }

  /**
   * 获取劫争位置
   */
  getKoPosition(): BoardPosition | null {
    return this.koPosition;
  }

  /**
   * 检查是否是合法落子位置
   */
  isValidMove(position: BoardPosition, color: 'black' | 'white'): boolean {
    const result = this.placeStone(position, color);
    if (result.success) {
      this.undo(); // 撤销测试性落子
      return true;
    }
    return false;
  }

  /**
   * 获取棋盘大小
   */
  getBoardSize(): number {
    return this.size;
  }

  /**
   * 获取指定位置的棋子（别名，用于技能系统）
   */
  getStoneAt(position: BoardPosition): StoneColor {
    return this.board[position.row][position.col];
  }

  /**
   * 获取提子统计
   */
  getCapturedCount(color: 'black' | 'white'): number {
    let count = 0;
    for (const move of this.moveHistory) {
      if (move.color === color) {
        count += move.capturedStones.length;
      }
    }
    return count;
  }

  /**
   * 获取当前手数
   */
  getMoveCount(): number {
    return this.moveHistory.length;
  }

  /**
   * 检查是否可以悔棋
   */
  canUndo(): boolean {
    return this.moveHistory.length > 0;
  }

  /**
   * 计算地盘（返回简化格式，用于技能系统）
   */
  countTerritory(): { blackTerritory: number; whiteTerritory: number } {
    const result = this.countTerritoryDetailed();
    return {
      blackTerritory: result.black,
      whiteTerritory: result.white
    };
  }

  /**
   * 计算地盘（详细版本，保留原方法）
   */
  private countTerritoryDetailed(): { black: number; white: number; empty: number } {
    const visited = new Set<string>();
    let blackTerritory = 0;
    let whiteTerritory = 0;
    let emptyPoints = 0;

    // 计算棋子数
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const color = this.board[row][col];
        if (color === 'black') blackTerritory++;
        else if (color === 'white') whiteTerritory++;
      }
    }

    // 计算空白区域的归属（简化版本：根据相邻棋子判断）
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const key = `${row},${col}`;
        if (this.board[row][col] === null && !visited.has(key)) {
          const region = this.getEmptyRegion({ row, col }, visited);
          const owner = this.determineRegionOwner(region);
          
          if (owner === 'black') {
            blackTerritory += region.length;
          } else if (owner === 'white') {
            whiteTerritory += region.length;
          } else {
            emptyPoints += region.length;
          }
        }
      }
    }

    return { black: blackTerritory, white: whiteTerritory, empty: emptyPoints };
  }
}
