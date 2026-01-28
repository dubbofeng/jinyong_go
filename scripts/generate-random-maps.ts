/**
 * 随机地图生成脚本
 * 参考Echoes项目的Perlin噪声地形生成算法
 */

import { db } from '../app/db';
import { maps, mapTiles, mapItems } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 简单的Perlin噪声实现（2D）
class PerlinNoise {
  private permutation: number[];
  
  constructor(seed?: number) {
    this.permutation = [];
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = i;
    }
    
    // 使用种子打乱
    const random = seed ? this.seededRandom(seed) : Math.random;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
    }
    
    // 复制以避免溢出
    this.permutation = [...this.permutation, ...this.permutation];
  }
  
  private seededRandom(seed: number) {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
  
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }
  
  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  
  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    const u = this.fade(x);
    const v = this.fade(y);
    
    const a = this.permutation[X] + Y;
    const b = this.permutation[X + 1] + Y;
    
    return this.lerp(v,
      this.lerp(u, this.grad(this.permutation[a], x, y), 
                   this.grad(this.permutation[b], x - 1, y)),
      this.lerp(u, this.grad(this.permutation[a + 1], x, y - 1),
                   this.grad(this.permutation[b + 1], x - 1, y - 1))
    );
  }
  
  /**
   * 多octave噪声，产生更大的值域和更丰富的细节
   */
  octaveNoise2D(x: number, y: number, octaves: number = 4, persistence: number = 0.5): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    
    return total / maxValue; // 归一化到 [-1, 1]
  }
}

// 地形类型权重配置
const TERRAIN_THEMES = {
  mountain: {
    name: '山地',
    weights: { wood: 20, gold: 10, dirt: 25, fire: 5, water: 40 },
  },
  forest: {
    name: '森林',
    weights: { wood: 45, gold: 15, dirt: 20, fire: 5, water: 15 },
  },
  village: {
    name: '村庄',
    weights: { wood: 35, gold: 20, dirt: 30, fire: 5, water: 10 },
  },
  river: {
    name: '河流',
    weights: { wood: 25, gold: 10, dirt: 20, fire: 5, water: 40 },
  },
  mixed: {
    name: '混合',
    weights: { wood: 25, gold: 15, dirt: 25, fire: 10, water: 25 },
  },
  hall: {
    name: '大厅',
    weights: { wood: 70, gold: 15, dirt: 10, fire: 5, water: 0 },
  },
  temple: {
    name: '寺庙',
    weights: { wood: 60, gold: 25, dirt: 10, fire: 5, water: 0 },
  },
  teahouse: {
    name: '茶馆',
    weights: { wood: 65, gold: 20, dirt: 10, fire: 5, water: 0 },
  },
};

type TerrainTheme = keyof typeof TERRAIN_THEMES;
type TileType = 'wood' | 'gold' | 'dirt' | 'fire' | 'water';

/**
 * 根据噪声值和权重选择地形类型
 * 将噪声值映射到累积权重阈值，保持空间连续性
 */
function selectTerrainByNoise(noiseValue: number, weights: Record<TileType, number>, minNoise: number, maxNoise: number): TileType {
  // 将噪声值从实际范围映射到 [0, 1]
  const normalized = (noiseValue - minNoise) / (maxNoise - minNoise);
  
  // 构建累积权重阈值
  const cumulative: Array<{ type: TileType; threshold: number }> = [];
  let total = 0;
  
  for (const [type, weight] of Object.entries(weights) as [TileType, number][]) {
    total += weight;
    cumulative.push({ type, threshold: total / 100 });
  }
  
  // 使用归一化的噪声值选择地形类型
  // 这样相邻的瓦片会有相似的噪声值，产生连续的地形
  for (const c of cumulative) {
    if (normalized <= c.threshold) {
      return c.type;
    }
  }
  
  return 'wood'; // 默认返回wood
}

/**
 * 生成随机地图
 */
async function generateRandomMap(
  mapId: string,
  name: string,
  width: number,
  height: number,
  theme: TerrainTheme,
  mapType: 'world' | 'scene' = 'scene',
  seed?: number
) {
  console.log(`\n🗺️  生成地图: ${name} (${width}×${height}, 主题: ${TERRAIN_THEMES[theme].name})`);
  
  const noise = new PerlinNoise(seed || Date.now());
  const weights = TERRAIN_THEMES[theme].weights;
  
  // 检查地图是否已存在（使用mapId字段）
  const existingMap = await db.query.maps.findFirst({
    where: eq(maps.mapId, mapId),
  });
  
  let dbMapId: number;
  
  if (existingMap) {
    console.log(`⚠️  地图 ${mapId} 已存在，删除旧数据...`);
    // 先删除mapItems（外键引用）
    await db.delete(mapItems).where(eq(mapItems.mapId, existingMap.id));
    // 再删除mapTiles
    await db.delete(mapTiles).where(eq(mapTiles.mapId, existingMap.id));
    // 最后删除maps
    await db.delete(maps).where(eq(maps.id, existingMap.id));
    
    // 重新创建地图记录
    const [newMap] = await db.insert(maps).values({
      mapId,
      name,
      mapType,
      width,
      height,
    }).returning();
    dbMapId = newMap.id;
  } else {
    // 创建新地图记录
    const [newMap] = await db.insert(maps).values({
      mapId,
      name,
      mapType,
      width,
      height,
    }).returning();
    dbMapId = newMap.id;
  }
  
  // 生成瓦片数据
  const tiles: Array<{
    mapId: number;
    x: number;
    y: number;
    tileType: string;
  }> = [];
  
  // 第一遍：收集所有噪声值以获得实际范围
  const scale = 0.15; // 噪声频率（调整地形大小）
  const octaves = 3; // octave数量（影响细节层次）
  const persistence = 0.5; // 振幅衰减（影响细节强度）
  
  const noiseValues: number[][] = [];
  let minNoise = Infinity;
  let maxNoise = -Infinity;
  
  for (let y = 0; y < height; y++) {
    noiseValues[y] = [];
    for (let x = 0; x < width; x++) {
      const noiseValue = noise.octaveNoise2D(x * scale, y * scale, octaves, persistence);
      noiseValues[y][x] = noiseValue;
      minNoise = Math.min(minNoise, noiseValue);
      maxNoise = Math.max(maxNoise, noiseValue);
    }
  }
  
  console.log(`  噪声范围: [${minNoise.toFixed(3)}, ${maxNoise.toFixed(3)}]`);
  
  // 第二遍：使用实际范围映射到地形类型
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const noiseValue = noiseValues[y][x];
      const tileType = selectTerrainByNoise(noiseValue, weights, minNoise, maxNoise);
      
      tiles.push({
        mapId: dbMapId,
        x,
        y,
        tileType,
      });
    }
  }
  
  // 批量插入瓦片（分批以避免超大查询）
  const batchSize = 1000;
  for (let i = 0; i < tiles.length; i += batchSize) {
    const batch = tiles.slice(i, i + batchSize);
    await db.insert(mapTiles).values(batch);
    console.log(`  插入瓦片: ${i + batch.length}/${tiles.length}`);
  }
  
  console.log(`✅ 地图 ${name} 生成完成！`);
  return { mapId, tileCount: tiles.length };
}

/**
 * 主函数：生成多个测试地图
 */
async function main() {
  console.log('🎲 开始生成随机地图...\n');
  
  const mapsToGenerate = [
    {
      mapId: 'huashan_scene',
      name: '华山传功厅',
      width: 32,
      height: 32,
      theme: 'hall' as TerrainTheme,
      seed: 12345,
    },
    {
      mapId: 'shaolin_scene',
      name: '少林寺禅房',
      width: 32,
      height: 32,
      theme: 'temple' as TerrainTheme,
      seed: 23456,
    },
    {
      mapId: 'xiangyang_scene',
      name: '襄阳城茶馆',
      width: 32,
      height: 32,
      theme: 'teahouse' as TerrainTheme,
      seed: 34567,
    },
  ];
  
  for (const mapConfig of mapsToGenerate) {
    await generateRandomMap(
      mapConfig.mapId,
      mapConfig.name,
      mapConfig.width,
      mapConfig.height,
      mapConfig.theme,
      mapConfig.seed
    );
  }
  
  console.log('\n🎉 所有地图生成完成！');
  
  // 自动添加装饰物
  console.log('\n🎨 开始添加装饰物...');
  try {
    const { stdout: decorStdout } = await execAsync('npx tsx scripts/add-decorations.ts');
    console.log(decorStdout);
  } catch (error: any) {
    console.error('❌ 添加装饰物失败:', error.message);
    throw error;
  }
  
  // 自动添加NPC
  console.log('\n🎭 开始添加NPC...');
  try {
    const { stdout: npcStdout } = await execAsync('npx tsx scripts/add-npcs-to-map.ts');
    console.log(npcStdout);
  } catch (error: any) {
    console.error('❌ 添加NPC失败:', error.message);
    throw error;
  }
  
  console.log('\n✅ 地图、装饰物和NPC全部生成完成！');
  console.log('\n可访问以下链接查看地图：');
  console.log('  🎮 游戏页面: http://localhost:9999/zh/game');
  console.log('  🛠️  华山传功厅: http://localhost:9999/zh/admin/maps/huashan_scene/edit');
  console.log('  🛠️  少林寺禅房: http://localhost:9999/zh/admin/maps/shaolin_scene/edit');
  console.log('  🛠️  襄阳城茶馆: http://localhost:9999/zh/admin/maps/xiangyang_teahouse/edit');
}

main()
  .then(() => {
    console.log('\n✨ 完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 错误:', error);
    process.exit(1);
  });
