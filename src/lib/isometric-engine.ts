/**
 * Isometric 渲染引擎
 * 负责等距地图的渲染、资源管理、坐标转换和性能优化
 */

import { cartesianToIsometric, isometricToCartesian } from './map/isometricUtils';
import { selectAutotileByCorners } from './autotile-helper';
import { Player } from './player';
import * as PF from 'pathfinding';

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
  tileType: string;      // 'wood', 'water', 'dirt', 'gold', 'fire' etc.
  walkable: boolean;
  autotileIndex?: number; // 用于autotile的索引（0-27，对应4x7网格）
}

export interface MapItem {
  id: number;
  itemId?: string;
  itemName: string;
  itemPath: string;      // 精灵图路径
  x: number;
  y: number;
  itemType: 'building' | 'npc' | 'portal' | 'decoration' | 'plant';
  properties?: Record<string, any>;
  collected?: boolean;
  blocking?: boolean;    // 是否阻挡移动
  size?: number;         // 物品尺寸（占据size x size格子，默认1）
  // 传送门相关
  targetMapId?: string;
  targetX?: number;
  targetY?: number;
  // 新增：用于存储关联地图的等距图路径
  linkedMapImage?: string; // 通过 targetMapId 查找到的地图等距图
}

// Autotile 精灵图集配置
export interface AutotileConfig {
  src: string;           // 精灵图集URL
  cols: number;          // 列数
  rows: number;          // 行数
  tileWidth: number;     // 单个瓦片宽度
  tileHeight: number;    // 单个瓦片高度
  terrain1: string;      // 第一种地形（主要/背景）
  terrain2: string;      // 第二种地形（过渡目标）
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
      // 设置crossOrigin以支持像素数据读取
      img.crossOrigin = 'anonymous';
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
    const results = await Promise.allSettled(urls.map(url => this.loadImage(url)));
    
    // 检查失败的图片
    const failures = results
      .map((result, i) => ({ result, url: urls[i] }))
      .filter(({ result }) => result.status === 'rejected');
    
    if (failures.length > 0) {
      console.error('❌ Failed to load images:', failures.map(f => f.url));
      failures.forEach(({ result, url }) => {
        if (result.status === 'rejected') {
          console.error(`  - ${url}:`, result.reason);
        }
      });
    }
    
    const successes = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Loaded ${successes}/${urls.length} images successfully`);
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
  
  // 玩家
  private player: Player | null = null;
  
  // 路径寻找
  private pathfinder: PF.AStarFinder;
  
  // 离屏Canvas缓存
  private staticLayerCache: HTMLCanvasElement | null = null;
  private cacheValid: boolean = false;
  
  // 视口
  private viewport: Viewport;
  
  // 调试标记
  private debugRenderedItems: boolean = false;
  
  // 像素数据缓存（避免重复创建canvas）
  private pixelDataCache: Map<string, ImageData> = new Map();
  
  // 记录最后一次阻挡玩家的树（用于触发树碰撞事件）
  private lastBlockingTree: MapItem | undefined = undefined;
  
  // 树碰撞回调（当玩家被树阻挡时调用）
  private onTreeCollision?: (tree: MapItem) => void;
  
  // 瓦片精灵图映射（使用center.png精灵图集）
  private readonly centerSpriteSheet = '/game/isometric/autotiles/center.png';
  private tileSprites: Map<string, { src: string; sx: number; sy: number; sw: number; sh: number }> = new Map([
    ['wood', { src: this.centerSpriteSheet, sx: 0, sy: 0, sw: 128, sh: 64 }],      // 木地 (位置0)
    ['gold', { src: this.centerSpriteSheet, sx: 128, sy: 0, sw: 128, sh: 64 }],    // 金地 (位置1)
    ['dirt', { src: this.centerSpriteSheet, sx: 256, sy: 0, sw: 128, sh: 64 }],    // 土地 (位置2)
    ['fire', { src: this.centerSpriteSheet, sx: 384, sy: 0, sw: 128, sh: 64 }],    // 火地 (位置3)
    ['water', { src: this.centerSpriteSheet, sx: 512, sy: 0, sw: 128, sh: 64 }],   // 水 (位置4)
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
      terrain1: 'dirt',
      terrain2: 'fire',
    }],
    ['wood-water', {
      src: '/game/isometric/autotiles/wood-water.png',
      cols: 4,
      rows: 7,
      tileWidth: 128,
      tileHeight: 64,
      terrain1: 'wood',
      terrain2: 'water',
    }],
    ['gold-dirt', {
      src: '/game/isometric/autotiles/gold-dirt.png',
      cols: 4,
      rows: 7,
      tileWidth: 128,
      tileHeight: 64,
      terrain1: 'gold',
      terrain2: 'dirt',
    }],
    ['gold-water', {
      src: '/game/isometric/autotiles/gold-water.png',
      cols: 4,
      rows: 7,
      tileWidth: 128,
      tileHeight: 64,
      terrain1: 'gold',
      terrain2: 'water',
    }],
    ['wood-gold', {
      src: '/game/isometric/autotiles/wood-gold.png',
      cols: 4,
      rows: 7,
      tileWidth: 128,
      tileHeight: 64,
      terrain1: 'wood',
      terrain2: 'gold',
    }],
    ['wood-dirt', {
      src: '/game/isometric/autotiles/wood-dirt.png',
      cols: 4,
      rows: 7,
      tileWidth: 128,
      tileHeight: 64,
      terrain1: 'wood',
      terrain2: 'dirt',
    }],
    ['fire-water', {
      src: '/game/isometric/autotiles/fire-water.png',
      cols: 4,
      rows: 7,
      tileWidth: 128,
      tileHeight: 64,
      terrain1: 'fire',
      terrain2: 'water',
    }],
    ['dirt-water', {
      src: '/game/isometric/autotiles/dirt-water.png',
      cols: 4,
      rows: 7,
      tileWidth: 128,
      tileHeight: 64,
      terrain1: 'dirt',
      terrain2: 'water',
    }],
    ['wood-fire', {
      src: '/game/isometric/autotiles/wood-fire.png',
      cols: 4,
      rows: 7,
      tileWidth: 128,
      tileHeight: 64,
      terrain1: 'wood',
      terrain2: 'fire',
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
    
    // 初始化A*寻路算法
    this.pathfinder = new PF.AStarFinder({
      allowDiagonal: false,  // 不允许对角移动
      dontCrossCorners: true,
    });
    
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
    // 更新配置以匹配实际地图尺寸
    this.config.mapWidth = mapData.width;
    this.config.mapHeight = mapData.height;
    
    this.mapData = mapData;
    this.cacheValid = false;
    
    // 为所有autotile瓦片自动计算索引
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        const tile = mapData.tiles[y]?.[x];
        if (tile && this.autotileConfigs.has(tile.tileType)) {
          // 这是一个autotile瓦片，自动计算索引
          if (tile.autotileIndex === undefined) {
            tile.autotileIndex = this.calculateAutotileIndex(x, y, tile.tileType);
          }
        }
      }
    }
    
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
    
    // 初始化玩家（在实际地图的中心）
    const centerX = Math.floor(mapData.width / 2);
    const centerY = Math.floor(mapData.height / 2);
    await this.spawnPlayer(centerX, centerY);
  }

  /**
   * 获取物品精灵图URL
   */
  private getSpriteUrl(item: MapItem): string {
    // 对于传送门，如果有关联地图的等距图，优先使用
    if (item.itemType === 'portal' && item.linkedMapImage) {
      return item.linkedMapImage;
    }
    
    // 对于建筑，如果有关联地图的等距图（场景切换建筑），优先使用
    if (item.itemType === 'building' && item.targetMapId && item.linkedMapImage) {
      return item.linkedMapImage;
    }
    
    // 使用数据库中的itemPath
    return item.itemPath;
  }

  /**
   * 更新单个物品状态（如切换图片）
   */
  async updateItemState(itemId: number, updates: Partial<MapItem>): Promise<void> {
    if (!this.mapData) return;
    const item = this.mapData.items.find((entry) => entry.id === itemId);
    if (!item) return;

    if (updates.itemPath && updates.itemPath !== item.itemPath) {
      try {
        await this.resourceLoader.loadImage(updates.itemPath);
      } catch (error) {
        console.warn('Failed to preload updated item image:', error);
      }
    }

    Object.assign(item, updates);
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
    if (!tileSprite) {
      return;
    }
    
    const img = this.resourceLoader.getImage(tileSprite.src);
    if (!img) {
      return;
    }
    
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
    
    // 传送门特效：脉冲动画
    if (item.itemType === 'portal') {
      this.renderPortalEffect(screenPos.x, screenPos.y);
    }
    
    // 绘制精灵图（NPC脚部对齐到瓦片底部中心）
    // 瓦片是菱形，底部顶点在中心向下tileHeight/2的位置
    // NPC图片底部应该对齐到菱形底部顶点
    this.ctx.drawImage(
      img,
      screenPos.x - img.width / 2,
      screenPos.y + this.config.tileHeight / 2 - img.height,
      img.width,
      img.height
    );
  }

  /**
   * 渲染传送门脉冲特效
   */
  private renderPortalEffect(x: number, y: number): void {
    const time = Date.now() / 1000;
    const pulse = 0.5 + Math.sin(time * Math.PI * 2) * 0.5; // 0-1之间脉冲，1秒周期
    
    this.ctx.save();
    
    // 外圈光晕（紫色）
    const outerRadius = 60 + pulse * 20;
    const outerGradient = this.ctx.createRadialGradient(x, y, 0, x, y, outerRadius);
    outerGradient.addColorStop(0, `rgba(138, 43, 226, ${0.3 * pulse})`); // 蓝紫色
    outerGradient.addColorStop(0.5, `rgba(147, 51, 234, ${0.2 * pulse})`);
    outerGradient.addColorStop(1, 'rgba(138, 43, 226, 0)');
    this.ctx.fillStyle = outerGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 中圈（亮紫色）
    const midRadius = 40 + pulse * 10;
    const midGradient = this.ctx.createRadialGradient(x, y, 0, x, y, midRadius);
    midGradient.addColorStop(0, `rgba(168, 85, 247, ${0.5 * pulse})`);
    midGradient.addColorStop(0.7, `rgba(147, 51, 234, ${0.3 * pulse})`);
    midGradient.addColorStop(1, 'rgba(138, 43, 226, 0)');
    this.ctx.fillStyle = midGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, midRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 内圈脉冲圆环
    this.ctx.strokeStyle = `rgba(192, 132, 252, ${0.8 * pulse})`;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 25 + pulse * 5, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // 中心点
    this.ctx.fillStyle = `rgba(216, 180, 254, ${0.9 * pulse})`;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 8, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
  }

  // ==================== 视口裁剪 ====================

  /**
   * 获取可见瓦片
   */
  private getVisibleTiles(): TileData[] {
    if (!this.mapData) return [];
    
    const tiles: TileData[] = [];
    
    // 等距视角下，对角线方向需要更多瓦片，所以扩大渲染范围
    // 使用更大的倍数确保完全覆盖屏幕
    const tilesWide = Math.ceil(this.viewport.width / this.config.tileWidth * 2) + 10;
    const tilesHigh = Math.ceil(this.viewport.height / this.config.tileHeight * 2) + 10;
    
    // 计算起始位置（视口中心向左上扩展）
    const startX = Math.floor(this.viewport.x - tilesWide / 2);
    const startY = Math.floor(this.viewport.y - tilesHigh / 2);
    
    // 渲染足够多的瓦片以填满视口
    for (let y = startY; y < startY + tilesHigh; y++) {
      for (let x = startX; x < startX + tilesWide; x++) {
        // 使用 getTileAt 获取瓦片，超出范围会返回火焰边界
        const tile = this.getTileAt(x, y);
        if (tile) {
          tiles.push(tile);
        }
      }
    }
    
    return tiles;
  }

  /**
   * 获取可见物品（支持无限平铺）
   */
  private getVisibleItems(): MapItem[] {
    if (!this.mapData) return [];
    
    const items: MapItem[] = [];
    
    // 计算视口范围
    const tilesWide = Math.ceil(this.viewport.width / this.config.tileWidth) + 4;
    const tilesHigh = Math.ceil(this.viewport.height / this.config.tileHeight) + 4;
    const startX = Math.floor(this.viewport.x - tilesWide / 2);
    const startY = Math.floor(this.viewport.y - tilesHigh / 2);
    
    // 计算需要重复物品的网格范围
    const gridMinX = Math.floor(startX / this.mapData.width);
    const gridMaxX = Math.ceil((startX + tilesWide) / this.mapData.width);
    const gridMinY = Math.floor(startY / this.mapData.height);
    const gridMaxY = Math.ceil((startY + tilesHigh) / this.mapData.height);
    
    // 在每个网格中重复物品
    for (let gridY = gridMinY; gridY <= gridMaxY; gridY++) {
      for (let gridX = gridMinX; gridX <= gridMaxX; gridX++) {
        for (const item of this.mapData.items) {
          // 计算物品在当前网格中的位置
          const offsetX = gridX * this.mapData.width;
          const offsetY = gridY * this.mapData.height;
          
          items.push({
            ...item,
            x: item.x + offsetX,
            y: item.y + offsetY,
          });
        }
      }
    }
    
    return items;
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
    this.clampViewport();
    this.cacheValid = false;
  }

  /**
   * 限制视口范围，防止超出地图边界
   */
  private clampViewport(): void {
    if (!this.mapData) return;
    
    // 限制视口不超出地图范围（留出边距）
    const margin = 5; // 边距（单位：瓦片）
    this.viewport.x = Math.max(margin, Math.min(this.config.mapWidth - margin, this.viewport.x));
    this.viewport.y = Math.max(margin, Math.min(this.config.mapHeight - margin, this.viewport.y));
  }

  /**
   * 将摄像机中心对准玩家位置（立即跟随，不插值）
   */
  centerCameraOnPlayer(): void {
    if (!this.player) return;
    
    const playerPos = this.player.getPosition();
    
    // 直接设置视口位置（不使用平滑插值）
    this.viewport.x = playerPos.x;
    this.viewport.y = playerPos.y;
    
    this.clampViewport();
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
    
    // 超出地图范围，返回火焰边界瓦片
    if (x < 0 || x >= this.config.mapWidth || y < 0 || y >= this.config.mapHeight) {
      return {
        x,
        y,
        tileType: 'fire',
        walkable: false,
      };
    }
    
    return this.mapData.tiles[y]?.[x] || null;
  }

  /**
   * 获取指定坐标的物品
   */
  getItemsAt(x: number, y: number): MapItem[] {
    if (!this.mapData) return [];
    const foundItems = this.mapData.items.filter(item => {
      // 物品的起始坐标
      const itemX = item.x;
      const itemY = item.y;
      const itemSize = item.size || 1;
      
      // 检查(x,y)是否在物品占据的区域内
      // 物品占据从(itemX, itemY)到(itemX + itemSize - 1, itemY + itemSize - 1)的区域
      const isInside = x >= itemX && x < itemX + itemSize &&
                       y >= itemY && y < itemY + itemSize;
      
      // 调试：记录所有找到的物品
      if (isInside) {
        console.log(`📦 getItemsAt(${x},${y}) 找到物品: ${item.itemName} @ (${itemX},${itemY}) size=${itemSize} blocking=${item.blocking}`);
      }
      
      return isInside;
    });
    
    if (foundItems.length > 0) {
      console.log(`📦 getItemsAt(${x},${y}) 返回 ${foundItems.length} 个物品`);
    }
    return foundItems;
  }

  /**
   * 检查坐标是否可行走（使用像素级碰撞检测）
   */
  isWalkable(x: number, y: number): boolean {
    const tile = this.getTileAt(x, y);
    if (!tile || !tile.walkable) {
      return false;
    }
    
    if (!this.mapData) return true;
    
    // 计算要检测的瓦片的屏幕位置和测试点
    const tileScreenPos = this.cartesianToScreen(x, y);
    const testPoints = [
      { x: tileScreenPos.x, y: tileScreenPos.y + this.config.tileHeight / 2, name: '底部中心' },
      { x: tileScreenPos.x, y: tileScreenPos.y - this.config.tileHeight / 2, name: '顶部中心' },
      { x: tileScreenPos.x - this.config.tileWidth / 2, y: tileScreenPos.y, name: '左侧' },
      { x: tileScreenPos.x + this.config.tileWidth / 2, y: tileScreenPos.y, name: '右侧' },
      { x: tileScreenPos.x, y: tileScreenPos.y, name: '中心' },
    ];
    
    // 遍历所有物品，检查是否有阻挡物品的精灵图覆盖到这个位置
    for (const item of this.mapData.items) {
      if (!item.blocking) continue;
      
      const spriteUrl = this.getSpriteUrl(item);
      const img = this.resourceLoader.getImage(spriteUrl);
      if (!img) continue; // 图片未加载，跳过
      
      // 计算物品精灵的屏幕矩形（精灵总是在物品的起始坐标 item.x, item.y 绘制）
      const itemScreenPos = this.cartesianToScreen(item.x, item.y);
      const spriteX = itemScreenPos.x - img.width / 2;
      const spriteY = itemScreenPos.y + this.config.tileHeight / 2 - img.height;
      const spriteRight = spriteX + img.width;
      const spriteBottom = spriteY + img.height;
      
      // 先粗略检查：测试点是否有任何一个在精灵图矩形范围内
      let hasPointInSprite = false;
      for (const point of testPoints) {
        if (point.x >= spriteX && point.x <= spriteRight &&
            point.y >= spriteY && point.y <= spriteBottom) {
          hasPointInSprite = true;
          break;
        }
      }
      
      if (!hasPointInSprite) {
        // 没有任何测试点在这个精灵图范围内，跳过
        continue;
      }
      
      // 至少有一个点在精灵图范围内，进行详细检测
      // 对每个在精灵图范围内的测试点进行像素检测
      for (const point of testPoints) {
        if (point.x < spriteX || point.x > spriteRight ||
            point.y < spriteY || point.y > spriteBottom) {
          continue; // 不在精灵图范围内
        }
        
        // 计算相对于精灵图的像素坐标
        const pixelX = Math.floor(point.x - spriteX);
        const pixelY = Math.floor(point.y - spriteY);
        
        const opaque = this.isPixelOpaque(img, pixelX, pixelY);
        
        if (opaque) {
          // 检查是否是树
          if (item.itemType === 'plant' && (item.properties?.plantType === 'tree' || item.itemName?.includes('树'))) {
            this.lastBlockingTree = item; // 记录被阻挡的树
          } else {
            this.lastBlockingTree = undefined; // 不是树，清除记录
          }
          return false;
        }
      }
    }
    return true;
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
    
    const config = this.autotileConfigs.get(tileType);
    if (!config) return 0;
    
    return selectAutotileByCorners(
      this.mapData,
      x,
      y,
      tileType,
      config.terrain1,
      config.terrain2
    );
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

  /**
   * 获取autotile配置
   */
  getAutotileConfig(autotileType: string): AutotileConfig | undefined {
    return this.autotileConfigs.get(autotileType);
  }

  /**
   * 设置tile的autotile索引
   */
  setTileAutotileIndex(x: number, y: number, index: number): void {
    const tile = this.getTileAt(x, y);
    if (tile && tile.autotileIndex !== undefined) {
      tile.autotileIndex = index;
      this.cacheValid = false; // 需要重新渲染
    }
  }

  /**
   * 获取地图数据（用于外部访问）
   */
  getMapData(): MapData | null {
    return this.mapData;
  }

  /**
   * 初始化玩家
   */
  async spawnPlayer(x: number, y: number): Promise<void> {
    this.player = new Player(x, y, 3); // 3 tiles/second
  }

  /**
   * 设置玩家移动完成回调
   */
  setPlayerMoveCompleteCallback(callback: (x: number, y: number) => void): void {
    if (this.player) {
      this.player.setOnMoveComplete(callback);
    }
  }
  
  /**
   * 设置树碰撞回调（当玩家被树阻挡时调用）
   */
  setTreeCollisionCallback(callback: (tree: MapItem) => void): void {
    this.onTreeCollision = callback;
  }

  /**
   * 创建可行走网格（用于路径寻找）
   */
  private createWalkableGrid(): number[][] {
    if (!this.mapData) {
      return [];
    }

    const grid: number[][] = [];
    for (let y = 0; y < this.config.mapHeight; y++) {
      grid[y] = [];
      for (let x = 0; x < this.config.mapWidth; x++) {
        // 使用isWalkable()检查瓦片和物品阻挡
        grid[y][x] = this.isWalkable(x, y) ? 0 : 1;
      }
    }
    return grid;
  }

  /**
   * 移动玩家到指定位置（使用A*路径寻找）
   * @returns 返回对象：{ success: boolean, blockedByTree?: MapItem }
   */
  movePlayerTo(targetX: number, targetY: number): { success: boolean; blockedByTree?: MapItem } {
    if (!this.player || !this.mapData) {
      return { success: false };
    }

    // 清除之前的树阻挡记录
    this.lastBlockingTree = undefined;
    
    // 检查目标是否可行走（包括瓦片和物品阻挡）
    const targetTile = this.getTileAt(targetX, targetY);
    if (!targetTile || !targetTile.walkable) {
      return { success: false };
    }
    
    // 使用 isWalkable() 检查物品阻挡（会自动检测树并记录到 lastBlockingTree）
    if (!this.isWalkable(targetX, targetY)) {
      // 立即保存树的引用，因为后续 createWalkableGrid 会覆盖 lastBlockingTree
      const blockedTree = this.lastBlockingTree;
      
      // 如果被树阻挡，返回树信息
      if (blockedTree) {
        this.lastBlockingTree = undefined; // 清除记录
        return { success: false, blockedByTree: blockedTree };
      }
      return { success: false };
    }

    // 创建可行走网格
    const walkableGrid = this.createWalkableGrid();
    const pfGrid = new PF.Grid(walkableGrid);

    // 获取当前位置
    const { x: startX, y: startY } = this.player.getPosition();

    // 运行A*算法
    const path = this.pathfinder.findPath(
      Math.floor(startX),
      Math.floor(startY),
      targetX,
      targetY,
      pfGrid
    );

    if (path.length === 0) {
      return { success: false };
    }

    // 转换路径格式
    const formattedPath = path.map(([x, y]) => ({ x, y }));
    this.player.setPath(formattedPath);
    
    return { success: true };
  }

  /**
   * 通过键盘移动玩家（像素级平滑移动）
   */
  movePlayerByKeyboard(dx: number, dy: number, deltaTime: number): void {
    if (!this.player) return;
    
    // 归一化方向向量
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return;
    
    const normDx = dx / length;
    const normDy = dy / length;
    
    // 计算移动距离（使用玩家速度）
    const moveDistance = this.player.getSpeed() * deltaTime;
    
    // 获取当前位置
    const currentPos = this.player.getPosition();
    const newX = currentPos.x + normDx * moveDistance;
    const newY = currentPos.y + normDy * moveDistance;
    
    // 检查新位置是否可行走
    const tileX = Math.floor(newX);
    const tileY = Math.floor(newY);
    
    // 边界检查
    if (tileX < 0 || tileX >= this.config.mapWidth || tileY < 0 || tileY >= this.config.mapHeight) {
      return;
    }
    
    // 碰撞检测
    if (!this.isWalkable(tileX, tileY)) {
      // 检查是否被树阻挡
      if (this.lastBlockingTree && this.onTreeCollision) {
        const tree = this.lastBlockingTree;
        this.lastBlockingTree = undefined;
        this.onTreeCollision(tree);
      }
      return;
    }
    
    // 更新玩家位置和方向
    this.player.setPositionDirect(newX, newY);
    this.player.setDirection(normDx, normDy);
    this.player.setMoving(true);
  }

  /**
   * 停止键盘移动（当没有按键时调用）
   */
  stopKeyboardMovement(): void {
    if (!this.player) return;
    
    // 只停止键盘移动，不影响点击路径移动
    // 检查玩家是否在跟随路径移动
    if (!this.player.hasPath()) {
      this.player.setMoving(false);
    }
  }

  /**
   * 获取玩家附近的可交互物品（NPC或传送门）
   * @returns 最近的可交互物品，如果没有则返回null
   */
  getNearbyInteractableItem(): MapItem | null {
    if (!this.mapData || !this.player) return null;
    
    const playerPos = this.player.getPosition();
    const interactionDistance = 3; // 交互距离：3格以内
    
    let nearestItem: MapItem | null = null;
    let nearestDistance = interactionDistance + 1;
    
    // 检查所有物品
    for (const item of this.mapData.items) {
      // 只检查NPC和传送门
      if (item.itemType !== 'npc' && item.itemType !== 'portal') {
        continue;
      }
      
      // 计算距离
      const dx = item.x - playerPos.x;
      const dy = item.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 如果在交互距离内且更近
      if (distance <= interactionDistance && distance < nearestDistance) {
        nearestItem = item;
        nearestDistance = distance;
      }
    }
    
    return nearestItem;
  }

  /**
   * 更新玩家状态（每帧调用）
   */
  updatePlayer(deltaTime: number): void {
    if (this.player) {
      this.player.update(deltaTime);
    }
  }

  /**
   * 渲染玩家
   */
  renderPlayer(ctx: CanvasRenderingContext2D): void {
    if (!this.player) return;

    const { x, y } = this.player.getPosition();
    
    // 转换为屏幕坐标
    const screenPos = this.cartesianToScreen(x, y);
    
    this.player.render(
      ctx,
      screenPos.x,
      screenPos.y,
      this.config.tileWidth,
      this.config.tileHeight
    );
  }

  /**
   * 获取玩家位置
   */
  getPlayerPosition(): { x: number; y: number } | null {
    return this.player ? this.player.getPosition() : null;
  }

  /**
   * 玩家是否正在移动
   */
  isPlayerMoving(): boolean {
    return this.player ? this.player.isMoving() : false;
  }

  /**
   * 获取指定位置的物品（NPC、建筑等）
   * 支持扩大的点击区域，因为精灵图会向上渲染
   */
  getItemAt(x: number, y: number): MapItem | null {
    if (!this.mapData) return null;
    
    // 在等距视图中，要形成视觉上1x2的竖直点击区域（匹配NPC精灵图形状）
    // 需要沿对角线方向检查：NPC脚在(x,y)，头部在屏幕正上方对应(x-1,y-1)
    // 检查两个位置形成1x2的视觉效果（1格宽，2格高）
    for (let d = 0; d <= 1; d++) {  // d=0: 当前位置(脚部), d=1: 对角上方(头部)
      const checkX = x - d;  // x坐标向左上移动
      const checkY = y - d;  // y坐标向左上移动
      
      // 查找该位置的物品
      for (const item of this.mapData.items) {
        // 使用模运算处理无限平铺地图
        const itemX = ((item.x % this.mapData.width) + this.mapData.width) % this.mapData.width;
        const itemY = ((item.y % this.mapData.height) + this.mapData.height) % this.mapData.height;
        const targetX = ((checkX % this.mapData.width) + this.mapData.width) % this.mapData.width;
        const targetY = ((checkY % this.mapData.height) + this.mapData.height) % this.mapData.height;
        
        if (itemX === targetX && itemY === targetY) {
          return item;
        }
      }
    }
    
    return null;
  }

  /**
   * 像素级点击检测：检查屏幕坐标是否点击到NPC精灵图的非透明像素
   * 同时检查玩家是否在NPC附近（交互距离内）
   */
  getItemAtPixel(screenX: number, screenY: number, checkDistance: boolean = true): MapItem | null {
    if (!this.mapData) return null;
    
    const visibleItems = this.getVisibleItems();
    const sortedItems = this.sortByDepth(visibleItems).reverse(); // 从前往后检测（深度大的在前）
    
    // 获取玩家位置（用于距离检测）
    const playerPos = this.player ? this.player.getPosition() : null;
    const interactionDistance = 3; // 交互距离：3格以内
    
    for (const item of sortedItems) {
      const spriteUrl = this.getSpriteUrl(item);
      const img = this.resourceLoader.getImage(spriteUrl);
      if (!img) continue;
      
      // 检查距离（如果需要且有玩家位置）
      if (checkDistance && playerPos) {
        const dx = item.x - playerPos.x;
        const dy = item.y - playerPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 如果距离超过交互距离，跳过此物品
        if (distance > interactionDistance) {
          continue;
        }
      }
      
      // 计算NPC在屏幕上的位置
      const screenPos = this.cartesianToScreen(item.x, item.y);
      const spriteX = screenPos.x - img.width / 2;
      const spriteY = screenPos.y + this.config.tileHeight / 2 - img.height;
      
      // 检查鼠标是否在精灵图的矩形范围内
      if (screenX < spriteX || screenX > spriteX + img.width ||
          screenY < spriteY || screenY > spriteY + img.height) {
        continue;
      }
      
      // 检查该像素是否透明
      const pixelX = Math.floor(screenX - spriteX);
      const pixelY = Math.floor(screenY - spriteY);
      
      if (this.isPixelOpaque(img, pixelX, pixelY)) {
        return item;
      }
    }
    
    return null;
  }

  /**
   * 检查图片指定像素是否不透明（使用缓存优化）
   */
  private isPixelOpaque(img: HTMLImageElement, x: number, y: number): boolean {
    // 检查坐标是否在图片范围内
    if (x < 0 || x >= img.width || y < 0 || y >= img.height) {
      return false;
    }
    
    // 使用图片URL作为缓存key
    const cacheKey = img.src;
    let imageData = this.pixelDataCache.get(cacheKey);
    
    // 如果没有缓存，读取整张图片的像素数据
    if (!imageData) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!tempCtx) {
        return false;
      }
      
      tempCtx.drawImage(img, 0, 0);
      
      try {
        imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        this.pixelDataCache.set(cacheKey, imageData);
      } catch (e) {
        // 跨域图片可能无法读取像素数据，使用保守策略：默认阻挡
        return true;
      }
    }
    
    // 从缓存的ImageData中读取像素
    const pixelIndex = (y * img.width + x) * 4;
    const alpha = imageData.data[pixelIndex + 3]; // alpha通道
    const opaque = alpha > 10; // alpha > 10 认为是不透明
    
    return opaque;
  }

  /**
   * 获取所有NPC
   */
  getAllNPCs(): MapItem[] {
    if (!this.mapData) return [];
    return this.mapData.items.filter(item => item.itemType === 'npc');
  }

  /**
   * 渲染悬停高亮效果
   */
  renderHoverHighlight(ctx: CanvasRenderingContext2D, tileX: number, tileY: number): void {
    // 转换为屏幕坐标
    const screenPos = this.cartesianToScreen(tileX, tileY);
    
    // 绘制脉冲圆圈
    const time = Date.now() / 1000;
    const pulseScale = 0.7 + Math.sin(time * 5) * 0.3; // 0.4 - 1.0之间脉冲
    const radius = 50 * pulseScale;
    
    ctx.save();
    
    // 背景发光（更大的圆，更明显）
    const gradient = ctx.createRadialGradient(screenPos.x, screenPos.y, 0, screenPos.x, screenPos.y, radius + 20);
    gradient.addColorStop(0, `rgba(255, 215, 0, ${0.3 * pulseScale})`);
    gradient.addColorStop(0.5, `rgba(255, 215, 0, ${0.15 * pulseScale})`);
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius + 20, 0, Math.PI * 2);
    ctx.fill();
    
    // 外圈（黄色发光）
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.9 * pulseScale})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // 中圈（白色）
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * pulseScale})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius - 8, 0, Math.PI * 2);
    ctx.stroke();
    
    // 内圈（黄色）
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.6 * pulseScale})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius - 15, 0, Math.PI * 2);
    ctx.stroke();
    
    // 中心点（更大更明显）
    ctx.fillStyle = `rgba(255, 215, 0, ${0.6 * pulseScale})`;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // 中心白点
    ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * pulseScale})`;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}