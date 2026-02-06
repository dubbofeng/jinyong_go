// 游戏引擎核心类

export interface GameConfig {
  width: number;
  height: number;
  tileSize: number;
}

export interface Position {
  x: number;
  y: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;
  private running: boolean = false;
  private lastTime: number = 0;
  private listeners: Map<string, ((data?: unknown) => void)[]> = new Map();

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    this.config = config;
    this.canvas.width = config.width;
    this.canvas.height = config.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    this.setupInputHandlers();
  }

  private setupInputHandlers() {
    window.addEventListener('keydown', (e) => this.emit('keydown', e));
    window.addEventListener('keyup', (e) => this.emit('keyup', e));
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.emit('click', { x, y });
    });
  }

  on(event: string, callback: (data?: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, data?: unknown) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop() {
    this.running = false;
  }

  private gameLoop = () => {
    if (!this.running) return;

    const now = performance.now();
    const deltaTime = Math.min(now - this.lastTime, 100); // 以毫秒为单位，限制最大值
    this.lastTime = now;

    this.emit('update', deltaTime);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  private render() {
    this.ctx.fillStyle = '#2a2a2a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.emit('render', this.ctx);
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getConfig(): GameConfig {
    return this.config;
  }
}
