/**
 * Isometric 渲染引擎
 * 负责等距地图的渲染、资源管理、坐标转换和性能优化
 */

import { cartesianToIsometric, isometricToCartesian } from './map/isometricUtils';

// ==================== 类型定义 ====================

export interface IsometricConfig {
  tileWidth: number;      // 瓦片宽度（128px）
  tileHeight: number;     // 瓦片高度（64px）
  mapWidth: number;       // 地图宽度（瓦片数）
  mapHeight: number;      // 地图高度（瓦片数）
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileData[][];
  items: MapItem[];
}

export interface TileData {
  x: number;
  y: number;
  tileType: string;      // 'grass', 'water', 'mountain', etc.
  walkable: boolean;
  autotileIndex?: number; // 用于autotile的索引（0-27，对应4x7网格）
}

export interface MapItem {
  id: string;
  x: number;
  y: number;
  itemType: 'building' | 'npc' | 'portal' | 'decoration';
  spriteId: string;
  properties?: Record<string, any>;
  blocking?: boolean;    // 是否阻挡移动
}

// Autotile 精灵图集配置
export interface AutotileConfig {
  src: string;           // 精灵图集URL
  cols: number;          // 列数
  rows: number;          // 行数
  tileWidth: number;     // 单个瓦片宽度
  tileHeight: number;    // 单个瓦片高度
}

export interface Viewport {
  x: number;             // 视口中心X（世界坐标）
  y: number;             // 视口中心Y（世界坐标）
  width: number;         // 视口宽度（像素）
  height: number;        // 视口高度（像素）
}

// ==================== 资源管理器 ====================

class ResourceLoader {
  private images: Map<string, HTMLImageElement> = new Map();
  private loading: Set<string> = new Set();
  private loadPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  /**
   * 加载图片资源
   */
  async loadImage(url: string): Promise<HTMLImageElement> {
    // 已加载
    if (this.images.has(url)) {
      return this.images.get(url)!;
    }

    // 正在加载
    if (this.loadPromises.has(url)) {
      return this.loadPromises.get(url)!;
    }

    // 开始加载
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(url, img);
        this.loading.delete(url);
        this.loadPromises.delete(url);
        resolve(img);
      };
      img.onerror = () => {
        this.loading.delete(url);
        this.loadPromises.delete(url);
        reject(new Error(`Failed to load image: ${url}`));
      };
      img.src = url;
    });

    this.loading.add(url);
    this.loadPromises.set(url, promise);
    return promise;
  }

  /**
   * 获取已加载的图片
   */
  getImage(url: string): HTMLImageElement | null {
    return this.images.get(url) || null;
  }

  /**
   * 预加载多个图片
   */
  async preloadImages(urls: string[]): Promise<void> {
    await Promise.all(urls.map(url => this.loadImage(url)));
  }

  /**
   * 清空缓存
   */
  clear() {
    this.images.clear();
    this.loading.clear();
    this.loadPromises.clear();
  }
}

// ==================== Isometric 渲染引擎 ====================

export class IsometricEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: IsometricConfig;
  private resourceLoader: ResourceLoader;
  
  // 地图数据
  private mapData: MapData | null = null;
  
  // 离屏Canvas缓存
  private staticLayerCache: HTMLCanvasElement | null = null;
  private cacheValid: boolean = false;
  
  // 视口
  private viewport: Viewport;
  
  // 瓦片精灵图映射（使用center.png精灵图集）
  private readonly centerSpriteSheet = '/game/isometric/autotiles/center.png';
  private tileSprites: Map<string, { src: string; sx: number; sy: number; sw: number; sh: number }> = new Map([
    ['grass', { src: this.centerSpriteSheet, sx: 0, sy: 0, sw: 128, sh: 64 }],      // 草地
    ['swamp', { src: this.centerSpriteSheet, sx: 128, sy: 0, sw: 128, sh: 64 }],    // 沼泽
    ['dirt', { src: this.centerSpriteSheet, sx: 256, sy: 0, sw: 128, sh: 64 }],     // 黑土
    ['desert', { src: this.centerSpriteSheet, sx: 384, sy: 0, sw: 128, sh: 64 }],   // 沙漠
    ['water', { src: this.centerSpriteSheet, sx: 512, sy: 0, sw: 128, sh: 64 }],    // 水
    ['mountain', { src: '/game/isometric/autotiles/gold-dirt.png', sx: 0, sy: 0, sw: 128, sh: 64 }],
    ['stone', { src: '/game/isometric/autotiles/wood-gold.png', sx: 0, sy: 0, sw: 128, sh: 64 }],
  ]);
  
  // Autotile 配置（用于地形过渡）
  private autotileConfigs: Map<string, AutotileConfig> = new Map([
    ['dirt-fire', {
      src: '/game/isometric/autotiles/dirt-fire.png',
      cols: 4,
      rows: 7,
      tileWidth: 128,
      tileHeight: 64,
    }],
    ['wood-water', {
      src: '/game/isometric/autotiles/wood-water.png',
      cols: 4,
      rows: 7,
      tileWidth: 128,
      tileHeight: 64,
    }],
    ['gold-dirt', {
      src: '/game/isometric/autotiles/gold-dirt.png',
      cols: 4,
      rows: 7,
      tileWidth: 128,
      tileHeight: 64,
    }],
  ]);

  constructor(canvas: HTMLCanvasElement, config: IsometricConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.config = config;
    this.resourceLoader = new ResourceLoader();
    
    // 初始化视口
    this.viewport = {
      x: config.mapWidth / 2,
      y: config.mapHeight / 2,
      width: canvas.width,
      height: canvas.height,
    };
  }

  // ==================== 地图加载 ====================

  /**
   * 加载地图数据
   */
  async loadMap(mapData: MapData): Promise<void> {
    this.mapData = mapData;
    this.cacheValid = false;
    
    // 收集所有需要加载的精灵图URL
    const spriteUrls = new Set<string>();
    
    // 添加瓦片精灵图
    Array.from(this.tileSprites.values()).forEach(tileSprite => {
      spriteUrls.add(tileSprite.src);
    });
    
    // 添加autotile精灵图
    Array.from(this.autotileConfigs.values()).forEach(config => {
      spriteUrls.add(config.src);
    });
    
    // 添加物品精灵图
    for (const item of mapData.items) {
      spriteUrls.add(this.getSpriteUrl(item));
    }
    
    await this.resourceLoader.preloadImages(Array.from(spriteUrls));
    
    // 生成静态层缓存
    this.generateStaticLayerCache();
  }

  /**
   * 获取物品精灵图URL
   */
  private getSpriteUrl(item: MapItem): string {
    const typeFolder: Record<MapItem['itemType'], string> = {
      building: 'buildings',
      npc: 'npcs',
      portal: 'items',
      decoration: 'plants',
    };
    
    const folder = typeFolder[item.itemType] || 'items';
    return `/game/isometric/${folder}/${item.spriteId}.png`;
  }

  // ==================== 坐标转换 ====================

  /**
   * 世界坐标转屏幕坐标
   */
  cartesianToScreen(x: number, y: number): { x: number; y: number } {
    const iso = cartesianToIsometric(x, y, this.config.tileWidth, this.config.tileHeight);
    
    // 转换为屏幕坐标（考虑视口偏移）
    const viewportIso = cartesianToIsometric(
      this.viewport.x,
      this.viewport.y,
      this.config.tileWidth,
      this.config.tileHeight
    );
    
    return {
      x: iso.x - viewportIso.x + this.viewport.width / 2,
      y: iso.y - viewportIso.y + this.viewport.height / 2,
    };
  }

  /**
   * 屏幕坐标转世界坐标
   */
  screenToCartesian(screenX: number, screenY: number): { x: number; y: number } {
    // 转换为等距坐标
    const viewportIso = cartesianToIsometric(
      this.viewport.x,
      this.viewport.y,
      this.config.tileWidth,
      this.config.tileHeight
    );
    
    const isoX = screenX - this.viewport.width / 2 + viewportIso.x;
    const isoY = screenY - this.viewport.height / 2 + viewportIso.y;
    
    // 转换为笛卡尔坐标
    return isometricToCartesian(isoX, isoY, this.config.tileWidth, this.config.tileHeight);
  }

  // ==================== 渲染系统 ====================

  /**
   * 渲染整个场景
   */
  render(): void {
    if (!this.mapData) return;
    
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 渲染静态层（从缓存）
    if (this.cacheValid && this.staticLayerCache) {
      this.ctx.drawImage(this.staticLayerCache, 0, 0);
    } else {
      this.renderStaticLayer();
    }
    
    // 渲染动态层（物品、NPC）
    this.renderDynamicLayer();
  }

  /**
   * 生成静态层缓存（地形瓦片）
   */
  private generateStaticLayerCache(): void {
    if (!this.mapData) return;
    
    // 创建离屏Canvas
    this.staticLayerCache = document.createElement('canvas');
    this.staticLayerCache.width = this.canvas.width;
    this.staticLayerCache.height = this.canvas.height;
    
    const ctx = this.staticLayerCache.getContext('2d');
    if (!ctx) return;
    
    // 渲染所有瓦片
    const visibleTiles = this.getVisibleTiles();
    
    for (const tile of visibleTiles) {
      this.renderTile(ctx, tile);
    }
    
    this.cacheValid = true;
  }

  /**
   * 渲染静态层
   */
  private renderStaticLayer(): void {
    if (!this.mapData) return;
    
    const visibleTiles = this.getVisibleTiles();
    
    for (const tile of visibleTiles) {
      this.renderTile(this.ctx, tile);
    }
  }

  /**
   * 渲染单个瓦片
   */
  private renderTile(ctx: CanvasRenderingContext2D, tile: TileData): void {
    // 检查是否使用autotile
    if (tile.autotileIndex !== undefined) {
      this.renderAutotile(ctx, tile);
      return;
    }
    
    // 使用普通瓦片精灵
    const tileSprite = this.tileSprites.get(tile.tileType);
    if (!tileSprite) return;
    
    const img = this.resourceLoader.getImage(tileSprite.src);
    if (!img) return;
    
    const screenPos = this.cartesianToScreen(tile.x, tile.y);
    
    // 从精灵图集中裁剪并绘制瓦片（居中对齐）
    ctx.drawImage(
      img,
      tileSprite.sx,                              // 源图片X坐标
      tileSprite.sy,                              // 源图片Y坐标
      tileSprite.sw,                              // 源图片宽度
      tileSprite.sh,                              // 源图片高度
      screenPos.x - this.config.tileWidth / 2,    // 目标X坐标
      screenPos.y - this.config.tileHeight / 2,   // 目标Y坐标
      this.config.tileWidth,                      // 目标宽度
      this.config.tileHeight                      // 目标高度
    );
  }

  /**
   * 渲染Autotile瓦片（用于地形过渡）
   */
  private renderAutotile(ctx: CanvasRenderingContext2D, tile: TileData): void {
    // 根据tileType查找autotile配置
    const autotileConfig = this.autotileConfigs.get(tile.tileType);
    if (!autotileConfig || tile.autotileIndex === undefined) return;
    
    const img = this.resourceLoader.getImage(autotileConfig.src);
    if (!img) return;
    
    // 计算autotile在精灵图集中的位置
    const index = tile.autotileIndex;
    const col = index % autotileConfig.cols;
    const row = Math.floor(index / autotileConfig.cols);
    
    const sx = col * autotileConfig.tileWidth;
    const sy = row * autotileConfig.tileHeight;
    
    const screenPos = this.cartesianToScreen(tile.x, tile.y);
    
    // 从autotile精灵图集中裁剪并绘制
    ctx.drawImage(
      img,
      sx,
      sy,
      autotileConfig.tileWidth,
      autotileConfig.tileHeight,
      screenPos.x - this.config.tileWidth / 2,
      screenPos.y - this.config.tileHeight / 2,
      this.config.tileWidth,
      this.config.tileHeight
    );
  }

  /**
   * 渲染动态层（物品、NPC）
   */
  private renderDynamicLayer(): void {
    if (!this.mapData) return;
    
    // 获取可见物品
    const visibleItems = this.getVisibleItems();
    
    // 按深度排序（z-index）
    const sortedItems = this.sortByDepth(visibleItems);
    
    // 渲染每个物品
    for (const item of sortedItems) {
      this.renderItem(item);
    }
  }

  /**
   * 渲染单个物品
   */
  private renderItem(item: MapItem): void {
    const spriteUrl = this.getSpriteUrl(item);
    const img = this.resourceLoader.getImage(spriteUrl);
    if (!img) return;
    
    const screenPos = this.cartesianToScreen(item.x, item.y);
    
    // 绘制精灵图（底部中心对齐）
    this.ctx.drawImage(
      img,
      screenPos.x - img.width / 2,
      screenPos.y - img.height,
      img.width,
      img.height
    );
  }

  // ==================== 视口裁剪 ====================

  /**
   * 获取可见瓦片
   */
  private getVisibleTiles(): TileData[] {
    if (!this.mapData) return [];
    
    const tiles: TileData[] = [];
    
    // 简单实现：裁剪到视口范围 +1 边界
    const minX = Math.max(0, Math.floor(this.viewport.x - this.viewport.width / this.config.tileWidth / 2) - 1);
    const maxX = Math.min(this.config.mapWidth, Math.ceil(this.viewport.x + this.viewport.width / this.config.tileWidth / 2) + 1);
    const minY = Math.max(0, Math.floor(this.viewport.y - this.viewport.height / this.config.tileHeight / 2) - 1);
    const maxY = Math.min(this.config.mapHeight, Math.ceil(this.viewport.y + this.viewport.height / this.config.tileHeight / 2) + 1);
    
    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        if (this.mapData.tiles[y] && this.mapData.tiles[y][x]) {
          tiles.push(this.mapData.tiles[y][x]);
        }
      }
    }
    
    return tiles;
  }

  /**
   * 获取可见物品
   */
  private getVisibleItems(): MapItem[] {
    if (!this.mapData) return [];
    
    // 简单实现：返回所有物品（后续可优化）
    return this.mapData.items;
  }

  // ==================== 深度排序 ====================

  /**
   * 按深度排序物品（用于正确的渲染顺序）
   */
  private sortByDepth(items: MapItem[]): MapItem[] {
    return items.slice().sort((a, b) => {
      // 深度公式：depth = x + y
      const depthA = a.x + a.y;
      const depthB = b.x + b.y;
      return depthA - depthB;
    });
  }

  // ==================== 视口控制 ====================

  /**
   * 设置视口中心
   */
  setViewportCenter(x: number, y: number): void {
    this.viewport.x = x;
    this.viewport.y = y;
    this.cacheValid = false; // 视口变化，缓存失效
  }

  /**
   * 移动视口
   */
  moveViewport(dx: number, dy: number): void {
    this.viewport.x += dx;
    this.viewport.y += dy;
    this.cacheValid = false;
  }

  /**
   * 获取视口中心
   */
  getViewportCenter(): { x: number; y: number } {
    return { x: this.viewport.x, y: this.viewport.y };
  }

  // ==================== 工具方法 ====================

  /**
   * 获取指定坐标的瓦片
   */
  getTileAt(x: number, y: number): TileData | null {
    if (!this.mapData) return null;
    if (x < 0 || x >= this.config.mapWidth || y < 0 || y >= this.config.mapHeight) {
      return null;
    }
    return this.mapData.tiles[y]?.[x] || null;
  }

  /**
   * 获取指定坐标的物品
   */
  getItemsAt(x: number, y: number): MapItem[] {
    if (!this.mapData) return [];
    return this.mapData.items.filter(item => item.x === x && item.y === y);
  }

  /**
   * 检查坐标是否可行走
   */
  isWalkable(x: number, y: number): boolean {
    const tile = this.getTileAt(x, y);
    if (!tile || !tile.walkable) return false;
    
    // 检查是否有阻挡物品
    const items = this.getItemsAt(x, y);
    return !items.some(item => item.blocking);
  }

  /**
   * 调整Canvas尺寸
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.viewport.width = width;
    this.viewport.height = height;
    this.cacheValid = false;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.resourceLoader.clear();
    this.staticLayerCache = null;
    this.mapData = null;
  }

  // ==================== Autotile 辅助函数 ====================

  /**
   * 计算autotile索引（基于周围瓦片）
   * 用于自动选择正确的过渡瓦片
   */
  calculateAutotileIndex(x: number, y: number, tileType: string): number {
    if (!this.mapData) return 0;
    
    // 检查周围8个方向
    const top = this.getTileAt(x, y - 1)?.tileType === tileType;
    const bottom = this.getTileAt(x, y + 1)?.tileType === tileType;
    const left = this.getTileAt(x - 1, y)?.tileType === tileType;
    const right = this.getTileAt(x + 1, y)?.tileType === tileType;
    
    const topLeft = this.getTileAt(x - 1, y - 1)?.tileType === tileType;
    const topRight = this.getTileAt(x + 1, y - 1)?.tileType === tileType;
    const bottomLeft = this.getTileAt(x - 1, y + 1)?.tileType === tileType;
    const bottomRight = this.getTileAt(x + 1, y + 1)?.tileType === tileType;
    
    // 简化的autotile索引计算（4x7 = 28种组合）
    // 这是一个基础实现，可以根据实际的autotile图集调整
    let index = 0;
    
    // 四个主方向的权重
    if (top) index += 1;
    if (right) index += 2;
    if (bottom) index += 4;
    if (left) index += 8;
    
    // 限制在0-27范围内
    return Math.min(index, 27);
  }

  /**
   * 为地图中的所有瓦片计算autotile索引
   */
  calculateAllAutotileIndices(autotileType: string): void {
    if (!this.mapData) return;
    
    for (let y = 0; y < this.config.mapHeight; y++) {
      for (let x = 0; x < this.config.mapWidth; x++) {
        const tile = this.getTileAt(x, y);
        if (tile && tile.tileType === autotileType) {
          tile.autotileIndex = this.calculateAutotileIndex(x, y, autotileType);
        }
      }
    }
    
    this.cacheValid = false; // 需要重新渲染
  }
}
