/**
 * 玩家角色类
 */

export interface PlayerState {
  x: number;              // 当前地图坐标X
  y: number;              // 当前地图坐标Y
  targetX: number | null; // 目标坐标X
  targetY: number | null; // 目标坐标Y
  isMoving: boolean;      // 是否正在移动
  speed: number;          // 移动速度（瓦片/秒）
  path: { x: number; y: number }[];  // 当前路径
  pathIndex: number;      // 路径中的当前索引
  direction: 0 | 1 | 2 | 3; // 当前方向：0=下 1=右 2=左 3=上
  animationFrame: number; // 当前动画帧（0-3）
  animationTime: number;  // 动画计时器
}

export class Player {
  private state: PlayerState;
  private spriteSheetUrl: string; // 动画精灵图表路径
  private spriteLoaded: boolean = false;
  private spriteSheet: HTMLImageElement | null = null;
  
  // 精灵图表配置（新图：512x640，4列x4行）
  private readonly FRAME_WIDTH = 128;  // 每帧宽度 (512/4)
  private readonly FRAME_HEIGHT = 160; // 每帧高度 (640/4)
  private readonly FRAMES_PER_DIR = 4; // 每个方向的帧数
  private readonly ANIMATION_FPS = 10; // 动画帧率

  constructor(x: number, y: number, speed: number = 3) {
    this.state = {
      x,
      y,
      targetX: null,
      targetY: null,
      isMoving: false,
      speed,
      path: [],
      pathIndex: 0,
      direction: 1, // 默认向右
      animationFrame: 0,
      animationTime: 0,
    };
    
    // 使用Canvas生成的行走动画精灵图表
    this.spriteSheetUrl = '/game/isometric/characters/player_walk_animation.png';
    this.loadSpriteSheet();
  }

  /**
   * 加载精灵图表
   */
  private loadSpriteSheet(): void {
    const img = new Image();
    img.onload = () => {
      this.spriteSheet = img;
      this.spriteLoaded = true;
      console.log('✅ Player spritesheet loaded');
    };
    img.onerror = () => {
      console.error('❌ Failed to load player spritesheet:', this.spriteSheetUrl);
    };
    img.src = this.spriteSheetUrl;
  }

  /**
   * 设置目标位置并开始移动
   */
  setPath(path: { x: number; y: number }[]): void {
    if (path.length === 0) return;
    
    this.state.path = path;
    this.state.pathIndex = 0;
    this.state.isMoving = true;
    
    if (path.length > 0) {
      this.state.targetX = path[0].x;
      this.state.targetY = path[0].y;
    }
  }

  /**
   * 更新玩家状态（每帧调用）
   * @param deltaTime 以秒为单位的时间间隔
   */
  update(deltaTime: number): void {
    // 更新动画
    if (this.state.isMoving) {
      this.state.animationTime += deltaTime;
      const frameTime = 1 / this.ANIMATION_FPS;
      if (this.state.animationTime >= frameTime) {
        this.state.animationTime -= frameTime;
        this.state.animationFrame = (this.state.animationFrame + 1) % this.FRAMES_PER_DIR;
      }
    } else {
      // 静止时使用第0帧
      this.state.animationFrame = 0;
      this.state.animationTime = 0;
    }
    
    if (!this.state.isMoving || this.state.targetX === null || this.state.targetY === null) {
      return;
    }

    const dx = this.state.targetX - this.state.x;
    const dy = this.state.targetY - this.state.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 根据移动方向更新朝向
    // 第0行=下, 第1行=右, 第2行=左, 第3行=上
    if (Math.abs(dx) > Math.abs(dy)) {
      // 水平移动为主
      this.state.direction = dx > 0 ? 1 : 2; // 右或左
    } else {
      // 垂直移动为主
      this.state.direction = dy > 0 ? 0 : 3; // 下或上
    }

    // 到达当前目标点
    if (distance < 0.05) {
      this.state.x = this.state.targetX;
      this.state.y = this.state.targetY;
      
      // 移动到路径中的下一个点
      this.state.pathIndex++;
      
      if (this.state.pathIndex < this.state.path.length) {
        const nextPoint = this.state.path[this.state.pathIndex];
        this.state.targetX = nextPoint.x;
        this.state.targetY = nextPoint.y;
      } else {
        // 路径完成
        console.log('✅ Player reached destination:', this.state.x, this.state.y);
        this.state.isMoving = false;
        this.state.targetX = null;
        this.state.targetY = null;
        this.state.path = [];
        this.state.pathIndex = 0;
      }
      return;
    }

    // 计算移动方向和速度（deltaTime已经是秒）
    const moveDistance = this.state.speed * deltaTime;
    const ratio = Math.min(moveDistance / distance, 1);
    
    this.state.x += dx * ratio;
    this.state.y += dy * ratio;
  }

  /**
   * 渲染玩家
   */
  render(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    tileWidth: number,
    tileHeight: number
  ): void {
    if (!this.spriteLoaded || !this.spriteSheet) return;

    // 计算玩家渲染尺寸（保持128:160的宽高比）
    const aspectRatio = this.FRAME_HEIGHT / this.FRAME_WIDTH; // 160/128 = 1.25
    const playerWidth = tileWidth * 0.6;
    const playerHeight = playerWidth * aspectRatio;
    
    // 计算渲染位置（玩家底部对齐瓦片中心）
    const renderX = screenX - playerWidth / 2;
    const renderY = screenY - playerHeight + 10; // 向上偏移，让玩家站在瓦片上

    // 从精灵图表中提取当前帧
    // 精灵图表布局：4行（方向）x 4列（帧）
    // 新图尺寸：512x640
    const sourceX = this.state.animationFrame * this.FRAME_WIDTH;
    const sourceY = this.state.direction * this.FRAME_HEIGHT;

    // 绘制当前动画帧
    ctx.drawImage(
      this.spriteSheet,
      sourceX,               // 源X
      sourceY,               // 源Y
      this.FRAME_WIDTH,      // 源宽度
      this.FRAME_HEIGHT,     // 源高度
      renderX,               // 目标X
      renderY,               // 目标Y
      playerWidth,           // 目标宽度
      playerHeight           // 目标高度
    );
    
    // 调试：绘制玩家位置标记
    if (this.state.isMoving) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(screenX, screenY, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * 获取当前位置
   */
  getPosition(): { x: number; y: number } {
    return { x: this.state.x, y: this.state.y };
  }

  /**
   * 设置位置（用于传送等）
   */
  setPosition(x: number, y: number): void {
    this.state.x = x;
    this.state.y = y;
    this.state.targetX = null;
    this.state.targetY = null;
    this.state.isMoving = false;
    this.state.path = [];
    this.state.pathIndex = 0;
  }

  /**
   * 直接设置位置（不清除路径，用于键盘移动）
   */
  setPositionDirect(x: number, y: number): void {
    this.state.x = x;
    this.state.y = y;
  }

  /**
   * 设置移动状态
   */
  setMoving(moving: boolean): void {
    this.state.isMoving = moving;
  }

  /**
   * 根据移动方向设置动画方向
   */
  setDirection(dx: number, dy: number): void {
    // 根据移动方向更新朝向
    // 第0行=下, 第1行=右, 第2行=左, 第3行=上
    if (Math.abs(dx) > Math.abs(dy)) {
      // 水平移动为主
      this.state.direction = dx > 0 ? 1 : 2; // 右或左
    } else {
      // 垂直移动为主
      this.state.direction = dy > 0 ? 0 : 3; // 下或上
    }
  }

  /**
   * 获取移动速度
   */
  getSpeed(): number {
    return this.state.speed;
  }

  /**
   * 检查是否有移动路径
   */
  hasPath(): boolean {
    return this.state.path.length > 0 && this.state.pathIndex < this.state.path.length;
  }

  /**
   * 是否正在移动
   */
  isMoving(): boolean {
    return this.state.isMoving;
  }

  /**
   * 停止移动
   */
  stop(): void {
    this.state.isMoving = false;
    this.state.targetX = null;
    this.state.targetY = null;
    this.state.path = [];
    this.state.pathIndex = 0;
  }
}
