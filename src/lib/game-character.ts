// 游戏角色类

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

  constructor(config: CharacterConfig) {
    this.config = config;
    this.targetX = config.x;
    this.targetY = config.y;
  }

  update(deltaTime: number, tileSize: number) {
    if (!this.moving) return;

    const dx = this.targetX - this.config.x;
    const dy = this.targetY - this.config.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.01) {
      this.config.x = this.targetX;
      this.config.y = this.targetY;
      this.moving = false;
      return;
    }

    const speed = this.config.speed * deltaTime;
    const ratio = Math.min(speed / distance, 1);

    this.config.x += dx * ratio;
    this.config.y += dy * ratio;
  }

  render(ctx: CanvasRenderingContext2D, tileSize: number) {
    const x = this.config.x * tileSize + tileSize / 2;
    const y = this.config.y * tileSize + tileSize / 2;
    const radius = tileSize / 3;

    ctx.fillStyle = this.config.color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.config.name, x, y - radius - 5);
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
}

export class Player extends Character {
  constructor(config: CharacterConfig) {
    super({ ...config, color: config.color || '#4a90e2' });
  }
}

export class NPC extends Character {
  private dialogue: string[];

  constructor(config: CharacterConfig, dialogue: string[] = []) {
    super({ ...config, color: config.color || '#ffd700' });
    this.dialogue = dialogue;
  }

  getDialogue(): string[] {
    return this.dialogue;
  }
}
