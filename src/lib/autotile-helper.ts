/**
 * Autotile选择助手
 * 根据周围地形智能选择合适的autotile瓦片
 */

import type { MapData, TileData } from '../lib/isometric-engine';
import { AutotileDebugger } from './autotile-debugger';

// Autotile分析数据类型
interface AutotileAnalysis {
  tiles: {
    index: number;
    isEmpty?: boolean;
    terrain1: string;
    terrain2?: string;
    edgeConnections: {
      top: { canConnectPure?: string[]; requiresTransition?: boolean };
      right: { canConnectPure?: string[]; requiresTransition?: boolean };
      bottom: { canConnectPure?: string[]; requiresTransition?: boolean };
      left: { canConnectPure?: string[]; requiresTransition?: boolean };
    };
    corners: {
      topLeft: string;
      topRight: string;
      bottomLeft: string;
      bottomRight: string;
    };
  }[];
}

/**
 * 简化的autotile选择器
 * 基于角落匹配来选择瓦片
 */
export function selectAutotileByCorners(
  mapData: MapData,
  x: number,
  y: number,
  autotileType: string,
  terrain1: string,
  terrain2: string,
  debug = false
): number {
  // 获取四个角的地形
  const topLeft = getCornerTerrain(mapData, x, y, 'topLeft', terrain1, terrain2);
  const topRight = getCornerTerrain(mapData, x, y, 'topRight', terrain1, terrain2);
  const bottomLeft = getCornerTerrain(mapData, x, y, 'bottomLeft', terrain1, terrain2);
  const bottomRight = getCornerTerrain(mapData, x, y, 'bottomRight', terrain1, terrain2);
  
  const corners = { topLeft, topRight, bottomLeft, bottomRight };
  
  if (debug) {
    console.log(`[Autotile Debug] Position (${x}, ${y}), Type: ${autotileType}`);
    console.log(`  Terrain1: ${terrain1}, Terrain2: ${terrain2}`);
    console.log(`  Corners: TL=${topLeft}, TR=${topRight}, BL=${bottomLeft}, BR=${bottomRight}`);
  }
  
  // 根据角落组合选择瓦片索引
  // 这是一个简化版本，使用角落匹配规则
  
  // 示例：dirt-fire (dirt ↔ fire)
  // 如果所有角都是fire，返回索引12 (纯火地过渡瓦片)
  if (topLeft === terrain2 && topRight === terrain2 && 
      bottomLeft === terrain2 && bottomRight === terrain2) {
    if (debug) console.log(`  → Index: 12 (all terrain2)`);
    AutotileDebugger.logTileSelection(x, y, autotileType, terrain1, terrain2, corners, 12);
    return 12; // 通常第3行第0列是更偏向terrain2的瓦片
  }
  
  // 如果所有角都是terrain1，返回索引0 (纯terrain1过渡瓦片)
  if (topLeft === terrain1 && topRight === terrain1 && 
      bottomLeft === terrain1 && bottomRight === terrain1) {
    if (debug) console.log(`  → Index: 0 (all terrain1)`);
    AutotileDebugger.logTileSelection(x, y, autotileType, terrain1, terrain2, corners, 0);
    return 0;
  }
  
  // 单角落侵入
  if (topLeft === terrain2 && topRight === terrain1 && 
      bottomLeft === terrain1 && bottomRight === terrain1) {
    return 0; // 左上角有terrain2
  }
  
  if (topLeft === terrain1 && topRight === terrain2 && 
      bottomLeft === terrain1 && bottomRight === terrain1) {
    return 1; // 右上角有terrain2
  }
  
  if (topLeft === terrain1 && topRight === terrain1 && 
      bottomLeft === terrain1 && bottomRight === terrain2) {
    return 2; // 右下角有terrain2
  }
  
  if (topLeft === terrain1 && topRight === terrain1 && 
      bottomLeft === terrain2 && bottomRight === terrain1) {
    return 3; // 左下角有terrain2
  }
  
  // 两个相邻角落
  if (topLeft === terrain2 && topRight === terrain2) {
    return 4; // 上方两角
  }
  
  if (bottomLeft === terrain2 && bottomRight === terrain2) {
    return 6; // 下方两角
  }
  
  if (topLeft === terrain2 && bottomLeft === terrain2) {
    return 8; // 左侧两角
  }
  
  if (topRight === terrain2 && bottomRight === terrain2) {
    return 9; // 右侧两角
  }
  
  // 对角线角落
  if (topLeft === terrain2 && bottomRight === terrain2) {
    return 12; // 对角线
  }
  
  if (topRight === terrain2 && bottomLeft === terrain2) {
    return 13; // 对角线
  }
  
  // 三个角落
  if (topLeft === terrain2 && topRight === terrain2 && bottomLeft === terrain2) {
    return 16;
  }
  
  if (topLeft === terrain2 && topRight === terrain2 && bottomRight === terrain2) {
    return 17;
  }
  
  if (topRight === terrain2 && bottomLeft === terrain2 && bottomRight === terrain2) {
    return 18;
  }
  
  if (topLeft === terrain2 && bottomLeft === terrain2 && bottomRight === terrain2) {
    return 19;
  }
  
  // 默认返回0
  AutotileDebugger.logTileSelection(x, y, autotileType, terrain1, terrain2, corners, 0);
  if (debug) console.log(`  → Index: 0 (default fallback)`);
  return 0;
}

/**
 * 获取某个角落的地形类型
 * 基于周围瓦片来推断角落应该是什么地形
 */
export function getCornerTerrain(
  mapData: MapData,
  x: number,
  y: number,
  corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
  terrain1: string,
  terrain2: string
): string {
  const getTerrain = (tx: number, ty: number): string => {
    if (tx < 0 || tx >= mapData.width || ty < 0 || ty >= mapData.height) {
      return terrain1; // 边界外默认为terrain1
    }
    const tile = mapData.tiles[ty]?.[tx];
    if (!tile) return terrain1;
    
    // 如果是纯地形
    if (tile.tileType === terrain1 || tile.tileType === terrain2) {
      return tile.tileType;
    }
    
    // 如果是过渡瓦片，根据位置猜测
    // 这里简化处理，假设过渡瓦片包含两种地形
    return terrain1;
  };
  
  switch (corner) {
    case 'topLeft':
      // 左上角受到 (x-1,y-1), (x-1,y), (x,y-1) 影响
      const tlTile = getTerrain(x - 1, y - 1);
      const topTile = getTerrain(x, y - 1);
      const leftTile = getTerrain(x - 1, y);
      
      // 如果大多数是terrain2，则角落是terrain2
      const tlCount = [tlTile, topTile, leftTile].filter(t => t === terrain2).length;
      return tlCount >= 2 ? terrain2 : terrain1;
      
    case 'topRight':
      const trTile = getTerrain(x + 1, y - 1);
      const topTile2 = getTerrain(x, y - 1);
      const rightTile = getTerrain(x + 1, y);
      const trCount = [trTile, topTile2, rightTile].filter(t => t === terrain2).length;
      return trCount >= 2 ? terrain2 : terrain1;
      
    case 'bottomLeft':
      const blTile = getTerrain(x - 1, y + 1);
      const bottomTile = getTerrain(x, y + 1);
      const leftTile2 = getTerrain(x - 1, y);
      const blCount = [blTile, bottomTile, leftTile2].filter(t => t === terrain2).length;
      return blCount >= 2 ? terrain2 : terrain1;
      
    case 'bottomRight':
      const brTile = getTerrain(x + 1, y + 1);
      const bottomTile2 = getTerrain(x, y + 1);
      const rightTile2 = getTerrain(x + 1, y);
      const brCount = [brTile, bottomTile2, rightTile2].filter(t => t === terrain2).length;
      return brCount >= 2 ? terrain2 : terrain1;
  }
}
