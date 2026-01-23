// 增强的 Tilemap 引擎 - 支持多层次地图和瓦片集管理

// 瓦片集配置
export interface TilesetConfig {
  id: string;
  name: string;
  tileSize: number;
  columns: number;
  imageUrl?: string;
  tiles: TileDefinition[];
}

// 瓦片定义
export interface TileDefinition {
  id: number;
  name: string;
  walkable: boolean;
  type: 'floor' | 'wall' | 'decoration' | 'portal';
  color?: string; // 用于纯色渲染（无图片时）
  animated?: boolean;
  animationFrames?: number[];
  animationSpeed?: number; // 帧切换速度（毫秒）
}

// 地图层配置
export interface MapLayer {
  name: string;
  type: 'ground' | 'decoration' | 'collision';
  visible: boolean;
  opacity: number;
  data: number[][]; // 瓦片ID的二维数组
}

// 增强的地图配置
export interface TilemapConfig {
  id: string;
  name: string;
  width: number; // 以瓦片为单位
  height: number;
  tileSize: number;
  tilesetId: string;
  layers: MapLayer[];
  portals: Portal[];
  npcSpawnPoints: NPCSpawnPoint[];
  properties?: Record<string, any>; // 自定义属性
}

export interface Portal {
  x: number;
  y: number;
  targetMapId: string;
  targetX: number;
  targetY: number;
  label: string;
}

export interface NPCSpawnPoint {
  npcId: string;
  name: string;
  x: number;
  y: number;
  dialogue: string[];
}

// 瓦片集管理器
export class TilesetManager {
  private tilesets: Map<string, TilesetConfig> = new Map();
  private loadedImages: Map<string, HTMLImageElement> = new Map();

  registerTileset(tileset: TilesetConfig) {
    this.tilesets.set(tileset.id, tileset);
    
    // 如果有图片URL，预加载图片
    if (tileset.imageUrl && typeof window !== 'undefined') {
      this.loadImage(tileset.id, tileset.imageUrl);
    }
  }

  private loadImage(tilesetId: string, url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImages.set(tilesetId, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  getTileset(id: string): TilesetConfig | undefined {
    return this.tilesets.get(id);
  }

  getTileDefinition(tilesetId: string, tileId: number): TileDefinition | undefined {
    const tileset = this.tilesets.get(tilesetId);
    return tileset?.tiles.find(t => t.id === tileId);
  }

  getImage(tilesetId: string): HTMLImageElement | undefined {
    return this.loadedImages.get(tilesetId);
  }
}

// 增强的地图渲染引擎
export class TilemapEngine {
  private config: TilemapConfig;
  private tilesetManager: TilesetManager;
  private animationTime: number = 0;
  private renderCache: Map<string, HTMLCanvasElement> = new Map();
  private cacheEnabled: boolean = true; // 重新启用缓存

  constructor(config: TilemapConfig, tilesetManager: TilesetManager) {
    this.config = config;
    this.tilesetManager = tilesetManager;
    this.initializeCache();
  }

  // 初始化缓存 - 为静态层创建离屏画布
  private initializeCache() {
    if (!this.cacheEnabled || typeof window === 'undefined') return;

    const { layers, tileSize, width, height } = this.config;
    
    for (const layer of layers) {
      // 只缓存地面层和装饰层（非碰撞层）
      if (layer.type === 'ground' || layer.type === 'decoration') {
        const cacheCanvas = document.createElement('canvas');
        cacheCanvas.width = width * tileSize;
        cacheCanvas.height = height * tileSize;
        
        const cacheCtx = cacheCanvas.getContext('2d');
        if (cacheCtx) {
          this.prerenderLayer(cacheCtx, layer);
          this.renderCache.set(layer.name, cacheCanvas);
        }
      }
    }
  }

  // 预渲染静态层到离屏画布
  private prerenderLayer(ctx: CanvasRenderingContext2D, layer: MapLayer) {
    const { tileSize, tilesetId } = this.config;
    const tileset = this.tilesetManager.getTileset(tilesetId);
    
    if (!tileset) return;

    for (let y = 0; y < layer.data.length; y++) {
      for (let x = 0; x < layer.data[y].length; x++) {
        const tileId = layer.data[y][x];
        if (tileId === 0) continue;
        
        const tileDef = this.tilesetManager.getTileDefinition(tilesetId, tileId);
        if (!tileDef || tileDef.animated) continue; // 跳过动画瓦片
        
        this.drawTile(ctx, tileDef, x * tileSize, y * tileSize, tileSize);
      }
    }
  }

  // 更新动画状态
  update(deltaTime: number) {
    this.animationTime += deltaTime;
  }

  // 渲染地图
  render(ctx: CanvasRenderingContext2D) {
    const { layers, tileSize } = this.config;
    
    // 按层级渲染
    for (const layer of layers) {
      if (!layer.visible) continue;
      
      // collision层只用于碰撞检测，不渲染
      if (layer.type === 'collision') continue;
      
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      
      // 如果有缓存，直接绘制缓存
      const cachedCanvas = this.renderCache.get(layer.name);
      if (cachedCanvas) {
        ctx.drawImage(cachedCanvas, 0, 0);
        
        // 如果该层有动画瓦片，单独渲染
        this.renderAnimatedTiles(ctx, layer);
      } else {
        // 没有缓存，实时渲染
        this.renderLayer(ctx, layer);
      }
      
      ctx.restore();
    }

    // 渲染传送门特效
    this.renderPortals(ctx);
  }

  // 单独渲染动画瓦片
  private renderAnimatedTiles(ctx: CanvasRenderingContext2D, layer: MapLayer) {
    const { tileSize, tilesetId } = this.config;
    
    for (let y = 0; y < layer.data.length; y++) {
      for (let x = 0; x < layer.data[y].length; x++) {
        const tileId = layer.data[y][x];
        if (tileId === 0) continue;
        
        const tileDef = this.tilesetManager.getTileDefinition(tilesetId, tileId);
        if (!tileDef || !tileDef.animated) continue;
        
        this.renderTile(ctx, tileDef, x, y, tileSize);
      }
    }
  }

  // 渲染单个图层
  private renderLayer(ctx: CanvasRenderingContext2D, layer: MapLayer) {
    const { tileSize, tilesetId } = this.config;
    const tileset = this.tilesetManager.getTileset(tilesetId);
    
    if (!tileset) {
      console.warn(`Tileset ${tilesetId} not found`);
      return;
    }

    for (let y = 0; y < layer.data.length; y++) {
      for (let x = 0; x < layer.data[y].length; x++) {
        const tileId = layer.data[y][x];
        if (tileId === 0) continue; // 0 表示空瓦片
        
        const tileDef = this.tilesetManager.getTileDefinition(tilesetId, tileId);
        if (!tileDef) continue;
        
        this.renderTile(ctx, tileDef, x, y, tileSize);
      }
    }
  }

  // 渲染单个瓦片
  private renderTile(
    ctx: CanvasRenderingContext2D,
    tileDef: TileDefinition,
    x: number,
    y: number,
    tileSize: number
  ) {
    const posX = x * tileSize;
    const posY = y * tileSize;

    // 如果是动画瓦片
    if (tileDef.animated && tileDef.animationFrames && tileDef.animationSpeed) {
      const frameCount = tileDef.animationFrames.length;
      const currentFrameIndex = Math.floor(this.animationTime / tileDef.animationSpeed) % frameCount;
      const currentTileId = tileDef.animationFrames[currentFrameIndex];
      const currentTileDef = this.tilesetManager.getTileDefinition(this.config.tilesetId, currentTileId);
      
      if (currentTileDef) {
        this.drawTile(ctx, currentTileDef, posX, posY, tileSize);
      }
    } else {
      this.drawTile(ctx, tileDef, posX, posY, tileSize);
    }
  }

  // 绘制瓦片（支持图片或纯色）
  private drawTile(
    ctx: CanvasRenderingContext2D,
    tileDef: TileDefinition,
    x: number,
    y: number,
    tileSize: number
  ) {
    const image = this.tilesetManager.getImage(this.config.tilesetId);
    
    if (image && image.complete) {
      // 使用图片渲染（未实现具体的精灵表切片逻辑）
      // TODO: 实现从精灵表中提取瓦片的逻辑
    } else {
      // 使用纯色渲染
      ctx.fillStyle = tileDef.color || '#8b7355';
      ctx.fillRect(x, y, tileSize, tileSize);
      
      // 装饰瓦片使用更粗的边框以增强可见度
      if (tileDef.type === 'decoration') {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = '#00000033';
        ctx.lineWidth = 1;
      }
      ctx.strokeRect(x, y, tileSize, tileSize);
      ctx.lineWidth = 1; // 重置线宽
    }
  }

  // 渲染传送门动画
  private renderPortals(ctx: CanvasRenderingContext2D) {
    const { portals, tileSize } = this.config;
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 添加脉冲动画效果
    const pulse = Math.sin(this.animationTime / 500) * 0.2 + 0.8;
    
    portals.forEach(portal => {
      const x = portal.x * tileSize + tileSize / 2;
      const y = portal.y * tileSize + tileSize / 2;
      
      ctx.save();
      ctx.globalAlpha = pulse;
      
      // 绘制传送门光晕
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, tileSize);
      gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, tileSize, 0, Math.PI * 2);
      ctx.fill();
      
      // 绘制传送门图标
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🚪', x, y);
      
      ctx.restore();
    });
  }

  // 检查位置是否可行走
  isWalkable(x: number, y: number): boolean {
    // 查找碰撞层
    const collisionLayer = this.config.layers.find(l => l.type === 'collision');
    if (!collisionLayer) {
      // 如果没有碰撞层，检查地面层
      return this.checkWalkableInLayer(this.config.layers[0], x, y);
    }
    
    return this.checkWalkableInLayer(collisionLayer, x, y);
  }

  private checkWalkableInLayer(layer: MapLayer, x: number, y: number): boolean {
    if (y < 0 || y >= layer.data.length || x < 0 || x >= layer.data[0].length) {
      return false;
    }
    
    const tileId = layer.data[y][x];
    if (tileId === 0) return true; // 空瓦片可行走
    
    const tileDef = this.tilesetManager.getTileDefinition(this.config.tilesetId, tileId);
    return tileDef?.walkable ?? true;
  }

  getConfig(): TilemapConfig {
    return this.config;
  }

  getPortalAt(x: number, y: number): Portal | null {
    return this.config.portals.find(p => p.x === x && p.y === y) || null;
  }

  getNPCSpawnPoints(): NPCSpawnPoint[] {
    return this.config.npcSpawnPoints;
  }
}

// 创建默认瓦片集
export function createDefaultTileset(): TilesetConfig {
  return {
    id: 'default',
    name: 'Default Tileset',
    tileSize: 32,
    columns: 8,
    tiles: [
      { id: 0, name: 'empty', walkable: true, type: 'floor' },
      { id: 1, name: 'floor', walkable: true, type: 'floor', color: '#8b7355' },
      { id: 2, name: 'wall', walkable: false, type: 'wall', color: '#4a4a4a' },
      { id: 3, name: 'portal', walkable: true, type: 'portal', color: '#6b46c1', animated: true, animationFrames: [3, 4], animationSpeed: 500 },
      { id: 4, name: 'portal_alt', walkable: true, type: 'portal', color: '#8b5cf6' },
      { id: 5, name: 'decoration_1', walkable: false, type: 'decoration', color: '#d97706' },
      { id: 6, name: 'decoration_2', walkable: false, type: 'decoration', color: '#059669' },
      // 水面动画瓦片
      { id: 7, name: 'water_1', walkable: false, type: 'floor', color: '#3b82f6' },
      { id: 8, name: 'water_2', walkable: false, type: 'floor', color: '#60a5fa' },
      { id: 9, name: 'water_animated', walkable: false, type: 'floor', color: '#3b82f6', animated: true, animationFrames: [7, 8], animationSpeed: 400 },
      // 火焰动画瓦片
      { id: 10, name: 'fire_1', walkable: false, type: 'decoration', color: '#ef4444' },
      { id: 11, name: 'fire_2', walkable: false, type: 'decoration', color: '#f97316' },
      { id: 12, name: 'fire_3', walkable: false, type: 'decoration', color: '#fbbf24' },
      { id: 13, name: 'fire_animated', walkable: false, type: 'decoration', color: '#ef4444', animated: true, animationFrames: [10, 11, 12, 11], animationSpeed: 150 },
    ],
  };
}
