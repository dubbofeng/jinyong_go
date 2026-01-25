/**
 * 地形类型配置
 * 定义所有可用的地形类型和它们的属性
 */

export interface TerrainType {
  id: string;
  name: string;
  nameZh: string;
  walkable: boolean;
  spriteSource: 'center' | 'autotile';
  spriteX?: number;        // center sprite sheet的x坐标
  spriteY?: number;        // center sprite sheet的y坐标
  autotileKey?: string;    // autotile配置的key
  description?: string;
}

/**
 * 基础地形类型（来自center.png精灵图集）
 */
export const BASE_TERRAINS: Record<string, TerrainType> = {
  grass: {
    id: 'grass',
    name: 'Grass',
    nameZh: '草地',
    walkable: true,
    spriteSource: 'center',
    spriteX: 0,
    spriteY: 0,
    description: '绿色草地，适合行走',
  },
  swamp: {
    id: 'swamp',
    name: 'Swamp',
    nameZh: '沼泽',
    walkable: false,
    spriteSource: 'center',
    spriteX: 128,
    spriteY: 0,
    description: '泥泞沼泽，无法通行',
  },
  dirt: {
    id: 'dirt',
    name: 'Dirt',
    nameZh: '黑土',
    walkable: true,
    spriteSource: 'center',
    spriteX: 256,
    spriteY: 0,
    description: '黑色泥土，可以行走',
  },
  desert: {
    id: 'desert',
    name: 'Desert',
    nameZh: '沙漠',
    walkable: true,
    spriteSource: 'center',
    spriteX: 384,
    spriteY: 0,
    description: '沙漠地形，可以缓慢行走',
  },
  water: {
    id: 'water',
    name: 'Water',
    nameZh: '水域',
    walkable: false,
    spriteSource: 'center',
    spriteX: 512,
    spriteY: 0,
    description: '深水区域，无法通行',
  },
};

/**
 * 地形过渡类型（使用autotile系统）
 */
export const TERRAIN_TRANSITIONS: Record<string, {
  id: string;
  name: string;
  nameZh: string;
  from: string;
  to: string;
  autotileKey: string;
  description: string;
}> = {
  'dirt-fire': {
    id: 'dirt-fire',
    name: 'Dirt to Desert',
    nameZh: '黑土到沙漠',
    from: 'dirt',
    to: 'desert',
    autotileKey: 'dirt-fire',
    description: '黑土到沙漠的渐变过渡，包含28种不同的边缘组合',
  },
  'wood-water': {
    id: 'wood-water',
    name: 'Wood to Water',
    nameZh: '木材到水域',
    from: 'grass',
    to: 'water',
    autotileKey: 'wood-water',
    description: '草地到水域的过渡，包含各种岸边形状',
  },
  'gold-dirt': {
    id: 'gold-dirt',
    name: 'Gold to Dirt',
    nameZh: '金色到泥土',
    from: 'desert',
    to: 'dirt',
    autotileKey: 'gold-dirt',
    description: '金色地形到泥土的过渡',
  },
  'gold-water': {
    id: 'gold-water',
    name: 'Gold to Water',
    nameZh: '金色到水域',
    from: 'desert',
    to: 'water',
    autotileKey: 'gold-water',
    description: '金色地形到水域的复杂过渡，支持多方向边缘',
  },
  'wood-gold': {
    id: 'wood-gold',
    name: 'Wood to Gold',
    nameZh: '木材到金色',
    from: 'grass',
    to: 'desert',
    autotileKey: 'wood-gold',
    description: '草地到金色地形的过渡',
  },
  'wood-dirt': {
    id: 'wood-dirt',
    name: 'Wood to Dirt',
    nameZh: '木材到泥土',
    from: 'grass',
    to: 'dirt',
    autotileKey: 'wood-dirt',
    description: '草地到黑土的渐变过渡',
  },
  'fire-water': {
    id: 'fire-water',
    name: 'Fire to Water',
    nameZh: '火焰到水域',
    from: 'desert',
    to: 'water',
    autotileKey: 'fire-water',
    description: '沙漠到水域的过渡，包含岛屿形状',
  },
  'dirt-water': {
    id: 'dirt-water',
    name: 'Dirt to Water',
    nameZh: '泥土到水域',
    from: 'dirt',
    to: 'water',
    autotileKey: 'dirt-water',
    description: '泥土到水域的完整过渡系统',
  },
  'wood-fire': {
    id: 'wood-fire',
    name: 'Wood to Fire',
    nameZh: '木材到火焰',
    from: 'grass',
    to: 'desert',
    autotileKey: 'wood-fire',
    description: '草地到沙漠的过渡，带有泥土补丁',
  },
};

/**
 * 获取所有地形类型ID
 */
export function getAllTerrainIds(): string[] {
  return Object.keys(BASE_TERRAINS);
}

/**
 * 获取所有过渡类型ID
 */
export function getAllTransitionIds(): string[] {
  return Object.keys(TERRAIN_TRANSITIONS);
}

/**
 * 根据两个地形类型查找对应的过渡autotile
 */
export function findTransition(fromTerrain: string, toTerrain: string): string | null {
  for (const [key, transition] of Object.entries(TERRAIN_TRANSITIONS)) {
    if (transition.from === fromTerrain && transition.to === toTerrain) {
      return key;
    }
    // 也支持反向查找
    if (transition.to === fromTerrain && transition.from === toTerrain) {
      return key;
    }
  }
  return null;
}

/**
 * 检查地形是否可行走
 */
export function isTerrainWalkable(terrainId: string): boolean {
  const terrain = BASE_TERRAINS[terrainId];
  return terrain ? terrain.walkable : true;
}

/**
 * 获取地形的中文名称
 */
export function getTerrainName(terrainId: string, locale: 'zh' | 'en' = 'zh'): string {
  const terrain = BASE_TERRAINS[terrainId];
  if (!terrain) return terrainId;
  return locale === 'zh' ? terrain.nameZh : terrain.name;
}
