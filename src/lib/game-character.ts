// 游戏角色类
import { Sprite, SpriteConfig, SpriteAnimation, SpriteFrame } from './sprite';
import { generateCharacterSprite, canvasToImage, CHARACTER_ASSETS } from './sprite-generator';
import { generateNPCAvatarSVG } from './svg-avatar-generator';

export interface CharacterConfig {
  id: string;
  name: string;
  x: number;
  y: number;
  speed: number;
  color: string;
}

export class Character {
  protected config: CharacterConfig;
  protected targetX: number;
  protected targetY: number;
  protected moving: boolean = false;
  protected sprite: Sprite | null = null;
  protected direction: 'down' | 'left' | 'right' | 'up' = 'down';

  constructor(config: CharacterConfig) {
    this.config = config;
    this.targetX = config.x;
    this.targetY = config.y;
  }

  /**
   * 创建精灵图 (32x32, 4方向 x 4帧)
   */
  protected createSprite(spriteImage: HTMLImageElement) {
    const frameWidth = 32;
    const frameHeight = 32;

    // 定义4个方向的动画
    const animations: SpriteAnimation[] = [
      {
        name: 'idle',
        frames: [{ x: 0, y: 0, width: frameWidth, height: frameHeight }],
        frameRate: 1,
        loop: true,
      },
      {
        name: 'walk_down',
        frames: [
          { x: 0, y: 0, width: frameWidth, height: frameHeight },
          { x: frameWidth, y: 0, width: frameWidth, height: frameHeight },
          { x: frameWidth * 2, y: 0, width: frameWidth, height: frameHeight },
          { x: frameWidth * 3, y: 0, width: frameWidth, height: frameHeight },
        ],
        frameRate: 8,
        loop: true,
      },
      {
        name: 'walk_left',
        frames: [
          { x: 0, y: frameHeight, width: frameWidth, height: frameHeight },
          { x: frameWidth, y: frameHeight, width: frameWidth, height: frameHeight },
          { x: frameWidth * 2, y: frameHeight, width: frameWidth, height: frameHeight },
          { x: frameWidth * 3, y: frameHeight, width: frameWidth, height: frameHeight },
        ],
        frameRate: 8,
        loop: true,
      },
      {
        name: 'walk_right',
        frames: [
          { x: 0, y: frameHeight * 2, width: frameWidth, height: frameHeight },
          { x: frameWidth, y: frameHeight * 2, width: frameWidth, height: frameHeight },
          { x: frameWidth * 2, y: frameHeight * 2, width: frameWidth, height: frameHeight },
          { x: frameWidth * 3, y: frameHeight * 2, width: frameWidth, height: frameHeight },
        ],
        frameRate: 8,
        loop: true,
      },
      {
        name: 'walk_up',
        frames: [
          { x: 0, y: frameHeight * 3, width: frameWidth, height: frameHeight },
          { x: frameWidth, y: frameHeight * 3, width: frameWidth, height: frameHeight },
          { x: frameWidth * 2, y: frameHeight * 3, width: frameWidth, height: frameHeight },
          { x: frameWidth * 3, y: frameHeight * 3, width: frameWidth, height: frameHeight },
        ],
        frameRate: 8,
        loop: true,
      },
    ];

    this.sprite = new Sprite({
      image: spriteImage,
      frameWidth,
      frameHeight,
      animations,
    });
  }

  update(deltaTime: number, tileSize: number) {
    // 先判断是否移动，设置动画状态
    if (!this.moving) {
      // 停止时播放idle动画
      if (this.sprite) {
        this.sprite.playAnimation('idle');
      }
      // 更新精灵动画
      if (this.sprite) {
        this.sprite.update(deltaTime);
      }
      return;
    }

    const dx = this.targetX - this.config.x;
    const dy = this.targetY - this.config.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.01) {
      this.config.x = this.targetX;
      this.config.y = this.targetY;
      this.moving = false;
      
      // 切换到idle动画并更新
      if (this.sprite) {
        this.sprite.playAnimation('idle');
        this.sprite.update(deltaTime);
      }
      return;
    }

    // 根据移动方向更新动画（在update之前）
    if (this.sprite) {
      if (Math.abs(dx) > Math.abs(dy)) {
        // 横向移动
        if (dx > 0) {
          this.direction = 'right';
          this.sprite.playAnimation('walk_right');
        } else {
          this.direction = 'left';
          this.sprite.playAnimation('walk_left');
        }
      } else {
        // 纵向移动
        if (dy > 0) {
          this.direction = 'down';
          this.sprite.playAnimation('walk_down');
        } else {
          this.direction = 'up';
          this.sprite.playAnimation('walk_up');
        }
      }
    }

    const speed = this.config.speed * deltaTime;
    const ratio = Math.min(speed / distance, 1);

    this.config.x += dx * ratio;
    this.config.y += dy * ratio;

    // 在动画状态设置完成后，更新精灵动画
    if (this.sprite) {
      this.sprite.update(deltaTime);
    }
  }

  render(ctx: CanvasRenderingContext2D, tileSize: number) {
    const x = this.config.x * tileSize;
    const y = this.config.y * tileSize;

    // 使用精灵渲染
    if (this.sprite && this.sprite.isLoaded()) {
      this.sprite.render(ctx, x, y, tileSize / 32);
    } else {
      // 回退到圆形渲染
      const centerX = x + tileSize / 2;
      const centerY = y + tileSize / 2;
      const radius = tileSize / 3;

      ctx.fillStyle = this.config.color;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 渲染名称
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(this.config.name, x + tileSize / 2, y - 5);
    ctx.fillText(this.config.name, x + tileSize / 2, y - 5);
  }

  moveTo(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
    this.moving = true;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.config.x, y: this.config.y };
  }

  getTilePosition(): { x: number; y: number } {
    return {
      x: Math.floor(this.config.x),
      y: Math.floor(this.config.y),
    };
  }

  isMoving(): boolean {
    return this.moving;
  }

  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  setPosition(x: number, y: number) {
    this.config.x = x;
    this.config.y = y;
    this.targetX = x;
    this.targetY = y;
    this.moving = false;
  }
}

export class Player extends Character {
  constructor(config: CharacterConfig) {
    super({ ...config, color: config.color || '#4a90e2' });
    
    // 生成玩家精灵图
    const asset = CHARACTER_ASSETS.player;
    const spriteCanvas = generateCharacterSprite(asset.color, asset.accentColor);
    const spriteImage = canvasToImage(spriteCanvas);
    this.createSprite(spriteImage);
  }
}

export class NPC extends Character {
  private dialogue: string[];
  private avatarSVG: string = ''; // 存储SVG字符串

  constructor(config: CharacterConfig, dialogue: string[] = []) {
    super({ ...config, color: config.color || '#ffd700' });
    this.dialogue = dialogue;
    
    // 根据NPC id生成精灵图和头像
    this.initializeSprite(config.id);
    this.generateAvatar(config.id);
  }

  private initializeSprite(npcId: string) {
    // 映射NPC id到资源配置
    const assetKey = npcId as keyof typeof CHARACTER_ASSETS;
    const asset = CHARACTER_ASSETS[assetKey] || CHARACTER_ASSETS.hong_qigong;
    
    const spriteCanvas = generateCharacterSprite(asset.color, asset.accentColor);
    const spriteImage = canvasToImage(spriteCanvas);
    this.createSprite(spriteImage);
  }

  private generateAvatar(npcId: string) {
    this.avatarSVG = generateNPCAvatarSVG(npcId);
  }

  getDialogue(): string[] {
    return this.dialogue;
  }

  getAvatar(): string {
    return this.avatarSVG;
  }
}
