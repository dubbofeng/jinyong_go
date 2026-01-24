/**
 * 精灵图系统 - 支持精灵图加载、帧动画、方向控制
 */

export interface SpriteFrame {
  x: number;      // 在精灵图中的x坐标
  y: number;      // 在精灵图中的y坐标
  width: number;  // 帧宽度
  height: number; // 帧高度
}

export interface SpriteAnimation {
  name: string;           // 动画名称 (idle, walk_up, walk_down, walk_left, walk_right)
  frames: SpriteFrame[];  // 帧序列
  frameRate: number;      // 帧率 (FPS)
  loop: boolean;          // 是否循环
}

export interface SpriteConfig {
  image: HTMLImageElement | string;  // 图片对象或路径
  frameWidth: number;                // 单帧宽度
  frameHeight: number;               // 单帧高度
  animations: SpriteAnimation[];     // 动画列表
}

/**
 * Sprite 类 - 管理精灵图和动画
 */
export class Sprite {
  private image: HTMLImageElement | null = null;
  private imageLoaded: boolean = false;
  private frameWidth: number;
  private frameHeight: number;
  private animations: Map<string, SpriteAnimation> = new Map();
  
  private currentAnimation: string = 'idle';
  private currentFrameIndex: number = 0;
  private animationTime: number = 0;

  constructor(config: SpriteConfig) {
    this.frameWidth = config.frameWidth;
    this.frameHeight = config.frameHeight;

    // 加载图片
    if (typeof config.image === 'string') {
      this.loadImage(config.image);
    } else {
      this.image = config.image;
      // 如果是dataURL，标记为已加载
      if (config.image.src && config.image.src.startsWith('data:')) {
        this.imageLoaded = true;
      } else {
        config.image.onload = () => {
          this.imageLoaded = true;
        };
      }
    }

    // 注册动画
    config.animations.forEach(anim => {
      this.animations.set(anim.name, anim);
    });
  }

  /**
   * 加载图片
   */
  private loadImage(src: string) {
    const img = new Image();
    img.onload = () => {
      this.imageLoaded = true;
    };
    img.onerror = () => {
      console.error(`Failed to load sprite image: ${src}`);
    };
    img.src = src;
    this.image = img;
  }

  /**
   * 更新动画状态
   */
  update(deltaTime: number) {
    if (!this.imageLoaded) return;

    const animation = this.animations.get(this.currentAnimation);
    if (!animation) return;

    // 更新动画时间
    this.animationTime += deltaTime;

    // 计算每帧时长 (毫秒)
    const frameDuration = 1000 / animation.frameRate;

    // 检查是否需要切换到下一帧
    if (this.animationTime >= frameDuration) {
      this.animationTime -= frameDuration;
      this.currentFrameIndex++;

      // 处理循环
      if (this.currentFrameIndex >= animation.frames.length) {
        if (animation.loop) {
          this.currentFrameIndex = 0;
        } else {
          this.currentFrameIndex = animation.frames.length - 1;
        }
      }
    }
  }

  /**
   * 渲染精灵
   */
  render(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 1) {
    if (!this.imageLoaded || !this.image) return;

    const animation = this.animations.get(this.currentAnimation);
    if (!animation || animation.frames.length === 0) return;

    const frame = animation.frames[this.currentFrameIndex];
    
    // 绘制当前帧
    ctx.drawImage(
      this.image,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      x,
      y,
      frame.width * scale,
      frame.height * scale
    );
  }

  /**
   * 播放指定动画
   */
  playAnimation(name: string) {
    if (this.currentAnimation === name) return;
    
    if (this.animations.has(name)) {
      this.currentAnimation = name;
      this.currentFrameIndex = 0;
      this.animationTime = 0;
    } else {
      console.warn(`Animation '${name}' not found`);
    }
  }

  /**
   * 获取当前动画名称
   */
  getCurrentAnimation(): string {
    return this.currentAnimation;
  }

  /**
   * 检查图片是否已加载
   */
  isLoaded(): boolean {
    return this.imageLoaded;
  }

  /**
   * 获取精灵尺寸
   */
  getSize(): { width: number; height: number } {
    return {
      width: this.frameWidth,
      height: this.frameHeight,
    };
  }
}

/**
 * 创建简单的纯色精灵图（用于临时占位）
 */
export function createColorSprite(
  color: string,
  width: number,
  height: number
): HTMLImageElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    // 添加边框
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);
  }

  const img = new Image();
  img.src = canvas.toDataURL();
  return img;
}
