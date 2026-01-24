/**
 * Isometric 地图工具函数
 */

/**
 * 将笛卡尔坐标转换为等距坐标（屏幕位置）
 */
export function cartesianToIsometric(x: number, y: number, tileWidth = 128, tileHeight = 64) {
  return {
    x: (x - y) * (tileWidth / 2),
    y: (x + y) * (tileHeight / 2),
  };
}

/**
 * 将等距坐标转换回笛卡尔坐标（网格位置）
 */
export function isometricToCartesian(
  screenX: number,
  screenY: number,
  tileWidth = 128,
  tileHeight = 64
) {
  const x = (screenX / (tileWidth / 2) + screenY / (tileHeight / 2)) / 2;
  const y = (screenY / (tileHeight / 2) - screenX / (tileWidth / 2)) / 2;
  return {
    x: Math.floor(x),
    y: Math.floor(y),
  };
}

/**
 * 计算瓦片在精灵表中的背景位置
 */
export function getTileBackgroundPosition(
  tileType: string,
  spriteColumns: number = 8,
  tileWidth: number = 128,
  tileHeight: number = 64
): string {
  const TILE_SPRITE_POSITIONS: Record<string, [number, number]> = {
    wood_center: [0, 0],
    gold_center: [1, 0],
    dirt_center: [2, 0],
    fire_center: [3, 0],
    water_center: [4, 0],
  };

  const position = TILE_SPRITE_POSITIONS[`${tileType}_center`] || [0, 0];
  const [col, row] = position;
  
  return `-${col * tileWidth}px -${row * tileHeight}px`;
}

/**
 * 检查是否可以在指定位置放置物品（避免重叠）
 */
export function canPlaceItem(
  x: number,
  y: number,
  width: number,
  height: number,
  existingItems: Array<{ x: number; y: number; width?: number; height?: number }>
): boolean {
  const maxWidth = 256;
  const adjustedWidth = Math.min(width || 64, maxWidth);
  const adjustedHeight = (height || 64) * (adjustedWidth / (width || 64));

  const newItemLeft = x * 128;
  const newItemRight = x * 128 + adjustedWidth;
  const newItemTop = y * 64;
  const newItemBottom = y * 64 + adjustedHeight;

  return !existingItems.some((item) => {
    const itemAdjustedWidth = Math.min(item.width || 64, maxWidth);
    const itemAdjustedHeight =
      ((item.height || 64) * itemAdjustedWidth) / (item.width || 64);

    const itemLeft = item.x * 128;
    const itemRight = item.x * 128 + itemAdjustedWidth;
    const itemTop = item.y * 64;
    const itemBottom = item.y * 64 + itemAdjustedHeight;

    // 检查是否重叠
    return !(
      newItemRight < itemLeft ||
      newItemLeft > itemRight ||
      newItemBottom < itemTop ||
      newItemTop > itemBottom
    );
  });
}

/**
 * 生成动画路径（用于动画物品）
 */
export function getAnimatedItemPath(basePath: string, frameNumber: number): string {
  // 假设动画帧文件命名为 000.png, 001.png, 002.png 等
  const paddedFrame = frameNumber.toString().padStart(3, '0');
  return basePath.replace(/\/\d{3}\.png$/, `/${paddedFrame}.png`);
}

/**
 * 计算地图中心偏移量（用于居中显示地图）
 */
export function getMapCenterOffset(
  mapWidth: number,
  mapHeight: number,
  viewportWidth: number,
  tileWidth = 128
): { offsetX: number; offsetY: number } {
  // 计算地图在等距视图中的总宽度
  const mapPixelWidth = mapWidth * tileWidth;
  
  // 居中偏移
  const offsetX = viewportWidth / 2 - tileWidth / 2;
  const offsetY = 0;

  return { offsetX, offsetY };
}
