import { db } from '@/src/db';
import { mapTiles, maps } from '@/src/db/schema';
// @ts-expect-error - noisejs doesn't have TypeScript types
import Noise from 'noisejs';

/**
 * 生成并保存地图瓦片
 * @param mapId 地图ID
 * @param width 地图宽度（瓦片数）
 * @param height 地图高度（瓦片数）
 * @param seed 随机种子（可选，用于生成固定地图）
 */
export async function generateAndSaveMapTiles(
  mapId: number,
  width = 32,
  height = 32,
  seed?: number
) {
  const noise = new Noise.Noise(seed || Math.random());
  const tiles = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = noise.perlin2(x / 10, y / 10);
      let tileType: string;

      // 根据噪声值确定地形类型
      if (value < -0.2)
        tileType = 'water'; // 20% water
      else if (value < -0.05)
        tileType = 'gold'; // 15% gold
      else if (value < 0.15)
        tileType = 'wood'; // 20% wood
      else if (value < 0.3)
        tileType = 'fire'; // 15% fire
      else tileType = 'dirt'; // 30% dirt

      tiles.push({
        mapId,
        x,
        y,
        tileType,
      });
    }
  }

  // 批量插入地图数据
  await db.insert(mapTiles).values(tiles);

  return {
    success: true,
    tilesGenerated: tiles.length,
    width,
    height,
  };
}

/**
 * 生成武侠风格的地图（适合场景地图）
 * 例如：山峰、树林、溪流等
 */
export async function generateWuxiaSceneMap(
  mapId: number,
  width = 32,
  height = 32,
  theme: 'mountain' | 'forest' | 'village' | 'river' = 'forest'
) {
  const noise = new Noise.Noise(Math.random());
  const tiles = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = noise.perlin2(x / 8, y / 8);
      let tileType: string;

      switch (theme) {
        case 'mountain':
          // 山地主题 - 更多石头和山路
          if (value < -0.3)
            tileType = 'water'; // 山涧
          else if (value < -0.1)
            tileType = 'gold'; // 岩石
          else if (value < 0.2)
            tileType = 'dirt'; // 山路
          else if (value < 0.4)
            tileType = 'wood'; // 树木
          else tileType = 'gold'; // 山峰
          break;

        case 'forest':
          // 森林主题 - 更多树木
          if (value < -0.25)
            tileType = 'water'; // 小溪
          else if (value < 0.0)
            tileType = 'wood'; // 密林
          else if (value < 0.3)
            tileType = 'wood'; // 树林
          else if (value < 0.5)
            tileType = 'dirt'; // 空地
          else tileType = 'wood'; // 树木
          break;

        case 'village':
          // 村庄主题 - 更多平地
          if (value < -0.3)
            tileType = 'water'; // 池塘
          else if (value < -0.1)
            tileType = 'wood'; // 树木
          else if (value < 0.4)
            tileType = 'dirt'; // 土地
          else if (value < 0.6)
            tileType = 'dirt'; // 空地
          else tileType = 'gold'; // 石路
          break;

        case 'river':
          // 河流主题
          const distanceFromCenter = Math.abs(y - height / 2);
          if (distanceFromCenter < 5) {
            tileType = 'water'; // 河流
          } else if (distanceFromCenter < 8) {
            tileType = value < 0 ? 'water' : 'dirt'; // 河岸
          } else {
            if (value < -0.2) tileType = 'wood';
            else if (value < 0.2) tileType = 'dirt';
            else tileType = 'gold';
          }
          break;

        default:
          tileType = 'dirt';
      }

      tiles.push({
        mapId,
        x,
        y,
        tileType,
      });
    }
  }

  // 批量插入地图数据
  await db.insert(mapTiles).values(tiles);

  return {
    success: true,
    tilesGenerated: tiles.length,
    width,
    height,
    theme,
  };
}

/**
 * 生成世界地图（更大的尺寸，用于全局导航）
 */
export async function generateWorldMap(mapId: number, width = 64, height = 64) {
  const noise = new Noise.Noise(Date.now());
  const tiles = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 使用更大的频率来创建更大的地形特征
      const value = noise.perlin2(x / 15, y / 15);
      let tileType: string;

      // 世界地图使用不同的分布
      if (value < -0.3)
        tileType = 'water'; // 湖泊/海洋
      else if (value < -0.1)
        tileType = 'dirt'; // 平原
      else if (value < 0.15)
        tileType = 'wood'; // 森林
      else if (value < 0.35)
        tileType = 'gold'; // 山地
      else tileType = 'dirt'; // 平原

      tiles.push({
        mapId,
        x,
        y,
        tileType,
      });
    }
  }

  // 批量插入地图数据
  await db.insert(mapTiles).values(tiles);

  return {
    success: true,
    tilesGenerated: tiles.length,
    width,
    height,
    mapType: 'world',
  };
}
