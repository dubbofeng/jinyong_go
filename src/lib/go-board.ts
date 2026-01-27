/**
 * 围棋棋盘渲染系统
 * 支持9路、13路、19路棋盘
 */

export type BoardSize = 9 | 13 | 19;
export type StoneColor = 'black' | 'white' | null;

export interface BoardPosition {
  row: number;
  col: number;
}

export interface Stone {
  position: BoardPosition;
  color: 'black' | 'white';
}

export class GoBoard {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size: BoardSize;
  
  // 棋盘状态 - 二维数组，null表示空位
  private board: StoneColor[][];
  
  // 渲染参数
  private padding: number = 40; // 棋盘边距
  private gridSize: number = 0; // 格子大小（动态计算）
  private stoneRadius: number = 0; // 棋子半径（动态计算）
  
  // 交互状态
  private hoveredPosition: BoardPosition | null = null;
  private lastMove: BoardPosition | null = null;
  private highlightedPositions: Map<string, number> = new Map(); // position key -> label number
  
  // 事件处理器引用（用于清理）
  private mouseMoveHandler: (e: MouseEvent) => void;
  private mouseLeaveHandler: () => void;
  private clickHandler: (e: MouseEvent) => void;
  
  constructor(canvas: HTMLCanvasElement, size: BoardSize = 9) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;
    this.size = size;
    
    // 初始化空棋盘
    this.board = Array(size).fill(null).map(() => Array(size).fill(null));
    
    // 计算渲染参数
    this.calculateRenderParams();
    
    // 绑定事件
    this.bindEvents();
  }
  
  /**
   * 计算渲染参数（根据Canvas大小和棋盘路数）
   */
  private calculateRenderParams(): void {
    const availableWidth = this.canvas.width - this.padding * 2;
    const availableHeight = this.canvas.height - this.padding * 2;
    
    // 使用较小的维度来保证棋盘是正方形
    const availableSize = Math.min(availableWidth, availableHeight);
    
    // 计算格子大小
    this.gridSize = availableSize / (this.size - 1);
    
    // 棋子半径略小于格子的一半
    this.stoneRadius = this.gridSize * 0.45;
  }
  
  /**
   * 绘制整个棋盘
   */
  render(): void {
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制背景
    this.drawBackground();
    
    // 绘制网格线
    this.drawGrid();
    
    // 绘制星位
    this.drawStarPoints();
    
    // 绘制坐标
    this.drawCoordinates();
    
    // 绘制悬停提示
    if (this.hoveredPosition) {
      this.drawHoverHint(this.hoveredPosition);
    }
    
    // 绘制棋子
    this.drawStones();
    
    // 绘制高亮标记（AI建议等）
    this.drawHighlights();
    
    // 绘制最后一手标记
    if (this.lastMove) {
      this.drawLastMoveMarker(this.lastMove);
    }
  }
  
  /**
   * 绘制背景（木纹效果）
   */
  private drawBackground(): void {
    // 创建木纹渐变效果
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#DEB887');
    gradient.addColorStop(0.5, '#D2B48C');
    gradient.addColorStop(1, '#DEB887');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  /**
   * 绘制网格线
   */
  private drawGrid(): void {
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    
    // 绘制垂直线
    for (let i = 0; i < this.size; i++) {
      const x = this.padding + i * this.gridSize;
      const y1 = this.padding;
      const y2 = this.padding + (this.size - 1) * this.gridSize;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x, y1);
      this.ctx.lineTo(x, y2);
      this.ctx.stroke();
    }
    
    // 绘制水平线
    for (let i = 0; i < this.size; i++) {
      const y = this.padding + i * this.gridSize;
      const x1 = this.padding;
      const x2 = this.padding + (this.size - 1) * this.gridSize;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y);
      this.ctx.lineTo(x2, y);
      this.ctx.stroke();
    }
  }
  
  /**
   * 绘制星位（天元等标记点）
   */
  private drawStarPoints(): void {
    const starPoints = this.getStarPoints();
    
    this.ctx.fillStyle = '#000000';
    
    for (const point of starPoints) {
      const x = this.padding + point.col * this.gridSize;
      const y = this.padding + point.row * this.gridSize;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  /**
   * 获取星位坐标
   */
  private getStarPoints(): BoardPosition[] {
    const points: BoardPosition[] = [];
    
    if (this.size === 9) {
      // 9路棋盘：4个角 + 天元
      const positions = [2, 4, 6];
      for (const row of [2, 6]) {
        for (const col of [2, 6]) {
          points.push({ row, col });
        }
      }
      points.push({ row: 4, col: 4 }); // 天元
    } else if (this.size === 13) {
      // 13路棋盘：4个角 + 4个边 + 天元
      const positions = [3, 6, 9];
      for (const row of [3, 9]) {
        for (const col of [3, 9]) {
          points.push({ row, col });
        }
      }
      points.push({ row: 6, col: 6 }); // 天元
    } else if (this.size === 19) {
      // 19路棋盘：标准星位
      const positions = [3, 9, 15];
      for (const row of positions) {
        for (const col of positions) {
          points.push({ row, col });
        }
      }
    }
    
    return points;
  }
  
  /**
   * 绘制坐标标签（A-S, 1-19）
   */
  private drawCoordinates(): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // 列标签 (A, B, C, ...)
    for (let col = 0; col < this.size; col++) {
      const x = this.padding + col * this.gridSize;
      const label = String.fromCharCode(65 + col); // A=65
      
      // 上方
      this.ctx.fillText(label, x, this.padding - 20);
      // 下方
      this.ctx.fillText(label, x, this.padding + (this.size - 1) * this.gridSize + 20);
    }
    
    // 行标签 (1, 2, 3, ...)
    this.ctx.textAlign = 'right';
    for (let row = 0; row < this.size; row++) {
      const y = this.padding + row * this.gridSize;
      const label = String(this.size - row); // 从上到下递减
      
      // 左侧
      this.ctx.fillText(label, this.padding - 15, y);
      // 右侧
      this.ctx.textAlign = 'left';
      this.ctx.fillText(label, this.padding + (this.size - 1) * this.gridSize + 15, y);
      this.ctx.textAlign = 'right';
    }
  }
  
  /**
   * 绘制悬停提示（半透明棋子）
   */
  private drawHoverHint(position: BoardPosition): void {
    // 检查位置是否为空
    if (this.board[position.row][position.col] !== null) {
      return;
    }
    
    const x = this.padding + position.col * this.gridSize;
    const y = this.padding + position.row * this.gridSize;
    
    // 绘制半透明的棋子（根据当前应该落子的颜色）
    this.ctx.globalAlpha = 0.3;
    
    // 如果设置了下一手的颜色，使用该颜色，否则默认黑色
    const nextColor = this.nextStoneColor || 'black';
    
    if (nextColor === 'black') {
      this.ctx.fillStyle = '#000000';
    } else {
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.strokeStyle = '#999999';
      this.ctx.lineWidth = 1;
    }
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.stoneRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    if (nextColor === 'white') {
      this.ctx.stroke();
    }
    
    this.ctx.globalAlpha = 1.0;
  }
  
  /**
   * 绘制所有棋子
   */
  private drawStones(): void {
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const color = this.board[row][col];
        if (color) {
          this.drawStone({ row, col }, color);
        }
      }
    }
  }
  
  /**
   * 绘制单个棋子
   */
  private drawStone(position: BoardPosition, color: 'black' | 'white'): void {
    const x = this.padding + position.col * this.gridSize;
    const y = this.padding + position.row * this.gridSize;
    
    // 绘制棋子阴影
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 5;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;
    
    // 绘制棋子主体
    if (color === 'black') {
      // 黑色棋子 - 渐变效果
      const gradient = this.ctx.createRadialGradient(
        x - this.stoneRadius * 0.3, y - this.stoneRadius * 0.3, 0,
        x, y, this.stoneRadius
      );
      gradient.addColorStop(0, '#666666');
      gradient.addColorStop(1, '#000000');
      this.ctx.fillStyle = gradient;
    } else {
      // 白色棋子 - 渐变效果
      const gradient = this.ctx.createRadialGradient(
        x - this.stoneRadius * 0.3, y - this.stoneRadius * 0.3, 0,
        x, y, this.stoneRadius
      );
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(1, '#DDDDDD');
      this.ctx.fillStyle = gradient;
    }
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.stoneRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 清除阴影设置
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    
    // 为白色棋子添加边框
    if (color === 'white') {
      this.ctx.strokeStyle = '#CCCCCC';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }
  
  /**
   * 绘制最后一手标记（红色方块）
   */
  private drawLastMoveMarker(position: BoardPosition): void {
    const x = this.padding + position.col * this.gridSize;
    const y = this.padding + position.row * this.gridSize;
    
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 2;
    const size = this.stoneRadius * 0.4;
    
    this.ctx.strokeRect(x - size, y - size, size * 2, size * 2);
  }
  
  /**
   * 绑定鼠标事件
   */
  private bindEvents(): void {
    this.mouseMoveHandler = this.handleMouseMove.bind(this);
    this.mouseLeaveHandler = this.handleMouseLeave.bind(this);
    this.clickHandler = this.handleClick.bind(this);
    
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.addEventListener('mouseleave', this.mouseLeaveHandler);
    this.canvas.addEventListener('click', this.clickHandler);
  }
  
  /**
   * 清理事件监听器
   */
  destroy(): void {
    this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.removeEventListener('mouseleave', this.mouseLeaveHandler);
    this.canvas.removeEventListener('click', this.clickHandler);
  }
  
  /**
   * 处理鼠标移动
   */
  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const position = this.screenToBoard(x, y);
    
    if (position && this.isValidPosition(position)) {
      this.hoveredPosition = position;
      this.canvas.style.cursor = 'pointer';
    } else {
      this.hoveredPosition = null;
      this.canvas.style.cursor = 'default';
    }
    
    this.render();
  }
  
  /**
   * 处理鼠标离开
   */
  private handleMouseLeave(): void {
    this.hoveredPosition = null;
    this.canvas.style.cursor = 'default';
    this.render();
  }
  
  /**
   * 处理点击事件
   */
  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const position = this.screenToBoard(x, y);
    
    if (position && this.isValidPosition(position)) {
      // 触发落子事件（由外部处理）
      if (this.onStonePlace) {
        this.onStonePlace(position);
      }
    }
  }
  
  // 落子事件回调
  private onStonePlace?: (position: BoardPosition) => void;
  
  // 下一手应该落子的颜色（用于悬停提示）
  private nextStoneColor: 'black' | 'white' = 'black';
  
  /**
   * 设置落子事件回调
   */
  setOnStonePlace(callback: (position: BoardPosition) => void): void {
    this.onStonePlace = callback;
  }
  
  /**
   * 设置下一手落子的颜色（用于悬停提示）
   */
  setNextStoneColor(color: 'black' | 'white'): void {
    this.nextStoneColor = color;
    this.render();
  }
  
  /**
   * 将屏幕坐标转换为棋盘坐标
   */
  private screenToBoard(x: number, y: number): BoardPosition | null {
    // 计算相对于棋盘的位置
    const relX = x - this.padding;
    const relY = y - this.padding;
    
    // 转换为行列索引（四舍五入到最近的交叉点）
    const col = Math.round(relX / this.gridSize);
    const row = Math.round(relY / this.gridSize);
    
    // 检查是否在有效范围内
    if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
      // 检查点击是否足够靠近交叉点
      const actualX = this.padding + col * this.gridSize;
      const actualY = this.padding + row * this.gridSize;
      const distance = Math.sqrt((x - actualX) ** 2 + (y - actualY) ** 2);
      
      // 如果距离小于半个格子，认为是有效点击
      if (distance < this.gridSize / 2) {
        return { row, col };
      }
    }
    
    return null;
  }
  
  /**
   * 检查位置是否有效
   */
  private isValidPosition(position: BoardPosition): boolean {
    return (
      position.row >= 0 && position.row < this.size &&
      position.col >= 0 && position.col < this.size
    );
  }
  
  /**
   * 放置棋子
   */
  placeStone(position: BoardPosition, color: 'black' | 'white'): boolean {
    if (!this.isValidPosition(position)) {
      return false;
    }
    
    if (this.board[position.row][position.col] !== null) {
      return false; // 位置已有棋子
    }
    
    this.board[position.row][position.col] = color;
    this.lastMove = position;
    this.render();
    return true;
  }
  
  /**
   * 移除棋子
   */
  removeStone(position: BoardPosition): void {
    if (this.isValidPosition(position)) {
      this.board[position.row][position.col] = null;
      this.render();
    }
  }
  
  /**
   * 获取指定位置的棋子颜色
   */
  getStone(position: BoardPosition): StoneColor {
    if (!this.isValidPosition(position)) {
      return null;
    }
    return this.board[position.row][position.col];
  }
  
  /**
   * 清空棋盘
   */
  clear(): void {
    this.board = Array(this.size).fill(null).map(() => Array(this.size).fill(null));
    this.lastMove = null;
    this.render();
  }
  
  /**
   * 获取棋盘状态的副本
   */
  getBoardState(): StoneColor[][] {
    return this.board.map(row => [...row]);
  }
  
  /**
   * 设置棋盘状态
   */
  setBoardState(state: StoneColor[][]): void {
    if (state.length !== this.size || state[0].length !== this.size) {
      throw new Error('Invalid board state size');
    }
    this.board = state.map(row => [...row]);
    this.render();
  }
  
  /**
   * 调整Canvas大小
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.calculateRenderParams();
    this.render();
  }
  
  /**
   * 获取棋盘路数
   */
  getSize(): BoardSize {
    return this.size;
  }

  /**
   * 高亮位置（用于AI建议等）
   */
  highlightPosition(position: BoardPosition, label: number): void {
    const key = `${position.row},${position.col}`;
    this.highlightedPositions.set(key, label);
    this.render();
  }

  /**
   * 清除所有高亮标记
   */
  clearHighlights(): void {
    this.highlightedPositions.clear();
    this.render();
  }

  /**
   * 绘制高亮标记
   */
  private drawHighlights(): void {
    this.highlightedPositions.forEach((label, key) => {
      const [row, col] = key.split(',').map(Number);
      
      // 计算屏幕坐标
      const x = this.padding + col * this.gridSize;
      const y = this.padding + row * this.gridSize;
      
      // 绘制紫色圆圈
      this.ctx.strokeStyle = 'rgba(147, 51, 234, 0.8)'; // purple-600
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.stoneRadius + 5, 0, Math.PI * 2);
      this.ctx.stroke();
      
      // 绘制数字标签
      this.ctx.fillStyle = 'rgba(147, 51, 234, 0.9)';
      this.ctx.font = `bold ${this.stoneRadius}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(label.toString(), x, y);
    });
  }
}
