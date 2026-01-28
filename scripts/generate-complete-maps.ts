/**
 * 完整地图生成脚本 - 一次生成所有元素
 * 包括：地形、建筑、装饰、植物、道路、NPC、传送门
 */

import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { maps, mapTiles, mapItems, items, npcs } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
const client = postgres(connectionString);
const db = drizzle(client);

// 地形类型常量
const TERRAIN = {
  GRASS: 1,   // wood - 草地
  GOLD: 2,    // gold - 装饰地面
  ROAD: 3,    // dirt - 道路
  BOUNDARY: 4, // fire - 边界
  WATER: 5,   // water - 水域
};

// ==================== Perlin噪声 ====================
class PerlinNoise {
  private permutation: number[];
  
  constructor(seed?: number) {
    this.permutation = [];
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = i;
    }
    
    const random = seed ? this.seededRandom(seed) : Math.random;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
    }
    
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
    
    return total / maxValue;
  }
}

// ==================== A*寻路算法 ====================
class AStar {
  private grid: number[][];
  private width: number;
  private height: number;

  constructor(grid: number[][]) {
    this.grid = grid;
    this.height = grid.length;
    this.width = grid[0].length;
  }

  findPath(startX: number, startY: number, endX: number, endY: number): { x: number; y: number }[] | null {
    const openSet: Array<{ x: number; y: number; g: number; h: number; f: number; parent: any }> = [];
    const closedSet = new Set<string>();

    const start = { x: startX, y: startY, g: 0, h: this.heuristic(startX, startY, endX, endY), f: 0, parent: null };
    start.f = start.g + start.h;
    openSet.push(start);

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      if (current.x === endX && current.y === endY) {
        return this.reconstructPath(current);
      }

      closedSet.add(`${current.x},${current.y}`);

      const neighbors = this.getNeighbors(current.x, current.y);
      for (const neighbor of neighbors) {
        if (closedSet.has(`${neighbor.x},${neighbor.y}`)) continue;

        const g = current.g + 1;
        const h = this.heuristic(neighbor.x, neighbor.y, endX, endY);
        const f = g + h;

        const existing = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
        if (!existing) {
          openSet.push({ x: neighbor.x, y: neighbor.y, g, h, f, parent: current });
        } else if (g < existing.g) {
          existing.g = g;
          existing.f = g + existing.h;
          existing.parent = current;
        }
      }
    }

    return null;
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  private getNeighbors(x: number, y: number): { x: number; y: number }[] {
    const neighbors = [];
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        if (this.grid[ny][nx] !== TERRAIN.WATER) {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }

    return neighbors;
  }

  private reconstructPath(node: any): { x: number; y: number }[] {
    const path = [];
    let current = node;
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    return path;
  }
}

// ==================== 地形生成 ====================
function generateTerrain(width: number, height: number, seed?: number): number[][] {
  const grid: number[][] = Array(height).fill(0).map(() => Array(width).fill(TERRAIN.GRASS));
  const noise = new PerlinNoise(seed || Date.now());
  
  const scale = 0.1;
  const octaves = 3;
  const persistence = 0.5;
  
  const noiseValues: number[][] = [];
  let minNoise = Infinity;
  let maxNoise = -Infinity;
  
  for (let y = 0; y < height; y++) {
    noiseValues[y] = [];
    for (let x = 0; x < width; x++) {
      const value = noise.octaveNoise2D(x * scale, y * scale, octaves, persistence);
      noiseValues[y][x] = value;
      minNoise = Math.min(minNoise, value);
      maxNoise = Math.max(maxNoise, value);
    }
  }
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const normalized = (noiseValues[y][x] - minNoise) / (maxNoise - minNoise);
      
      if (normalized < 0.15) {
        grid[y][x] = TERRAIN.WATER;
      } else if (normalized < 0.30) {
        grid[y][x] = TERRAIN.GOLD;
      } else {
        grid[y][x] = TERRAIN.GRASS;
      }
    }
  }
  
  return grid;
}

// ==================== 建筑门口计算 ====================
function getBuildingDoor(x: number, y: number, size: number, facing: string): { x: number; y: number } {
  switch (facing) {
    case 'down':
      return { x: x + Math.floor(size / 2), y: y + size };
    case 'right':
      return { x: x + size, y: y + Math.floor(size / 2) };
    case 'up':
      return { x: x + Math.floor(size / 2), y: y - 1 };
    case 'left':
      return { x: x - 1, y: y + Math.floor(size / 2) };
    default:
      return { x: x + Math.floor(size / 2), y: y + size };
  }
}

// ==================== 道路生成 ====================
function generateRoads(
  grid: number[][],
  buildings: Array<{ x: number; y: number; doorX: number; doorY: number }>
): void {
  const astar = new AStar(grid);
  
  for (let i = 0; i < buildings.length - 1; i++) {
    const start = buildings[i];
    const end = buildings[i + 1];
    
    const path = astar.findPath(start.doorX, start.doorY, end.doorX, end.doorY);
    
    if (path) {
      for (const point of path) {
        if (grid[point.y][point.x] !== TERRAIN.WATER) {
          grid[point.y][point.x] = TERRAIN.ROAD;
        }
      }
    }
  }
}

// ==================== 主函数 ====================
async function main() {
  console.log('🗺️  开始生成完整地图系统...\n');

  // 1. 查询所有可用物品
  console.log('1️⃣  查询可用物品...');
  const allItems = await db.select().from(items);
  
  const buildingItems = allItems.filter(i => i.itemType === 'building' && i.category === 'chinese_buildings');
  const decorationItems = allItems.filter(i => i.itemType === 'decoration');
  const plantItems = allItems.filter(i => i.itemType === 'plant');
  const npcItems = allItems.filter(i => i.itemType === 'npc');
  
  console.log(`   建筑: ${buildingItems.length}, 装饰: ${decorationItems.length}, 植物: ${plantItems.length}, NPC: ${npcItems.length}`);

  // 2. 确保传送门存在
  console.log('\n2️⃣  检查传送门...');
  let portalItem = allItems.find(i => i.itemId === 'portal_default');
  if (!portalItem) {
    console.log('   创建传送门物品...');
    [portalItem] = await db.insert(items).values({
      itemId: 'portal_default',
      name: '传送门',
      itemType: 'portal',
      category: 'portal',
      imagePath: '/game/isometric/objects/portal.png',
      size: 1,
      blocking: false,
      interactable: true,
    }).returning();
    console.log('   ✅ 传送门已创建');
  } else {
    console.log('   ✅ 传送门已存在');
  }

  // 3. 从数据库获取所有地图配置和NPC数据
  console.log('\n3️⃣  获取地图配置和NPC数据...');
  const allMaps = await db.select().from(maps).orderBy(maps.id);
  
  // 获取所有NPC数据，按地图分组
  const allNpcs = await db.select().from(npcs);
  const npcsByMap = allNpcs.reduce((acc, npc) => {
    if (!acc[npc.mapId]) {
      acc[npc.mapId] = [];
    }
    // 获取对应的item ID (npc_xxxxx)
    const itemId = `npc_${npc.npcId}`;
    acc[npc.mapId].push({
      itemId,
      x: npc.positionX,
      y: npc.positionY,
      npcId: npc.npcId,
    });
    return acc;
  }, {} as Record<string, Array<{ itemId: string; x: number; y: number; npcId: string }>>);
  
  const mapConfigs = allMaps.map((m, index) => ({
    id: m.id,
    mapId: m.mapId,
    name: m.name,
    width: m.width,
    height: m.height,
    seed: 10000 + m.id * 1111, // 基于ID生成唯一seed
    isWorld: m.mapType === 'world',
    npcsData: npcsByMap[m.mapId] || [], // 从数据库获取该地图的NPC数据
  }));
  
  console.log(`   找到 ${mapConfigs.length} 个地图`);
  console.log(`   找到 ${allNpcs.length} 个NPC`);
  
  // 显示各地图的NPC数量
  for (const config of mapConfigs) {
    if (config.npcsData.length > 0) {
      console.log(`   📍 ${config.name}: ${config.npcsData.length} 个NPC`);
    }
  }

  // 4. 生成每个地图
  for (const config of mapConfigs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 生成地图: ${config.name} (${config.width}x${config.height})`);
    console.log('='.repeat(60));

    // 获取或创建地图记录
    const [mapRecord] = await db
      .select()
      .from(maps)
      .where(eq(maps.id, config.id))
      .limit(1);

    if (!mapRecord) {
      console.log('❌ 地图记录不存在');
      continue;
    }

    // 跳过世界地图（如果已有数据）
    if (config.isWorld) {
      const existingTiles = await db.select()
        .from(mapTiles)
        .where(eq(mapTiles.mapId, mapRecord.id))
        .limit(1);
      
      if (existingTiles.length > 0) {
        console.log('⚠️  世界地图已有数据，跳过生成（保留已配置的传送门位置）');
        continue;
      }
    }

    // 清除旧数据
    await db.delete(mapTiles).where(eq(mapTiles.mapId, mapRecord.id));
    await db.delete(mapItems).where(eq(mapItems.mapId, mapRecord.id));

    // 生成地形
    console.log('🌍 生成地形...');
    const terrain = generateTerrain(config.width, config.height, config.seed);
    console.log('   ✅ 地形生成完成');

    // 放置建筑物 (5个)
    console.log('🏛️  放置建筑...');
    const buildings: Array<{ x: number; y: number; size: number; facing: string; doorX: number; doorY: number; itemId: string }> = [];
    const numBuildings = 5;
    const margin = 5;
    
    // 玩家初始位置在地图中心，确保建筑不和玩家重叠
    const playerCenterX = Math.floor(config.width / 2);
    const playerCenterY = Math.floor(config.height / 2);
    const safeDistance = 8; // 玩家周围8格范围内不放建筑
    const minBuildingDistance = 6; // 建筑之间最小距离
    
    // 检查是否与已有建筑太近
    const isTooCloseToBuildings = (x: number, y: number, size: number): boolean => {
      for (const building of buildings) {
        // 计算两个建筑中心点的距离
        const centerX1 = x + size / 2;
        const centerY1 = y + size / 2;
        const centerX2 = building.x + building.size / 2;
        const centerY2 = building.y + building.size / 2;
        const distance = Math.sqrt(
          Math.pow(centerX1 - centerX2, 2) + 
          Math.pow(centerY1 - centerY2, 2)
        );
        if (distance < minBuildingDistance) {
          return true;
        }
      }
      return false;
    };
    
    for (let i = 0; i < numBuildings && i < buildingItems.length; i++) {
      const item = buildingItems[i % buildingItems.length];
      let x, y;
      let attempts = 0;
      let foundSafeSpot = false;
      
      // 尝试找到不与玩家和其他建筑重叠的位置
      do {
        x = margin + Math.floor(Math.random() * (config.width - margin * 2 - item.size!));
        y = margin + Math.floor(Math.random() * (config.height - margin * 2 - item.size!));
        
        // 检查建筑的所有格子是否与玩家安全区域重叠
        let tooClose = false;
        for (let dy = 0; dy < item.size!; dy++) {
          for (let dx = 0; dx < item.size!; dx++) {
            const bx = x + dx;
            const by = y + dy;
            if (Math.abs(bx - playerCenterX) < safeDistance && 
                Math.abs(by - playerCenterY) < safeDistance) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) break;
        }
        
        // 检查是否与已有建筑太近
        if (!tooClose && !isTooCloseToBuildings(x, y, item.size!)) {
          foundSafeSpot = true;
          break;
        }
        
        attempts++;
      } while (attempts < 100);
      
      // 如果找不到安全位置，跳过这个建筑
      if (!foundSafeSpot) {
        console.log(`   ⚠️  ${item.name} 无法找到安全位置，跳过`);
        continue;
      }
      
      const facing = ['down', 'right', 'up', 'left'][Math.floor(Math.random() * 4)];
      const door = getBuildingDoor(x, y, item.size!, facing);
      
      buildings.push({ x, y, size: item.size!, facing, doorX: door.x, doorY: door.y, itemId: item.id });
      
      await db.insert(mapItems).values({
        mapId: mapRecord.id,
        itemId: item.id,
        x, y, facing,
      });
      
      console.log(`   + ${item.name} @ (${x}, ${y}) facing ${facing}`);
    }

    // 生成道路连接建筑
    if (buildings.length >= 2) {
      console.log('🛤️  生成道路...');
      generateRoads(terrain, buildings);
      console.log(`   ✅ 连接 ${buildings.length} 个建筑`);
    }

    // 记录需要避开的位置（NPC和传送门周围）
    const blockedPositions: {x: number, y: number}[] = [];

    // 放置NPC (从数据库读取的NPC数据)
    if (!config.isWorld && config.npcsData.length > 0) {
      console.log('👥 放置NPC...');
      for (const npcData of config.npcsData) {
        const item = npcItems.find(n => n.itemId === npcData.itemId);
        if (!item) {
          console.log(`   ⚠️  NPC item ${npcData.itemId} 不存在`);
          continue;
        }
        
        // 使用数据库中存储的坐标
        const x = npcData.x;
        const y = npcData.y;
        
        // 验证坐标是否合法
        if (x < 0 || x >= config.width || y < 0 || y >= config.height) {
          console.log(`   ⚠️  NPC ${npcData.npcId} 坐标超出地图范围: (${x}, ${y})`);
          continue;
        }
        
        await db.insert(mapItems).values({
          mapId: mapRecord.id,
          itemId: item.id,
          x, y,
        });
        
        // 记录NPC周围3格范围为禁区
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            blockedPositions.push({ x: x + dx, y: y + dy });
          }
        }
        
        console.log(`   + ${item.name} @ (${x}, ${y}) [NPC: ${npcData.npcId}]`);
      }
    }

    // 放置传送门 (场景地图返回世界地图)
    if (!config.isWorld && portalItem) {
      console.log('🌀 放置传送门...');
      // 随机选择四个角之一放置传送门，但要确保离建筑足够远
      const corners = [
        { x: margin + 2, y: margin + 2 },                                     // 左上角
        { x: config.width - margin - 3, y: margin + 2 },                      // 右上角
        { x: margin + 2, y: config.height - margin - 3 },                     // 左下角
        { x: config.width - margin - 3, y: config.height - margin - 3 },     // 右下角
      ];
      
      // 找到离建筑最远的角落
      const minBuildingDistance = 5;
      let bestCorner = corners[0];
      let maxMinDistance = 0;
      
      for (const corner of corners) {
        // 计算这个角到所有建筑的最小距离
        let minDistToBuilding = Infinity;
        for (const building of buildings) {
          const dist = Math.sqrt((corner.x - building.x) ** 2 + (corner.y - building.y) ** 2);
          minDistToBuilding = Math.min(minDistToBuilding, dist);
        }
        
        // 选择距离建筑最远的角
        if (minDistToBuilding > maxMinDistance) {
          maxMinDistance = minDistToBuilding;
          bestCorner = corner;
        }
      }
      
      const x = bestCorner.x;
      const y = bestCorner.y;
      
      await db.insert(mapItems).values({
        mapId: mapRecord.id,
        itemId: portalItem.id,
        x, y,
        sceneLinkMapId: 'world_map',
        sceneLinkX: 32,
        sceneLinkY: 32,
      });
      
      // 记录传送门周围3格范围为禁区
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          blockedPositions.push({ x: x + dx, y: y + dy });
        }
      }
      
      console.log(`   ✅ 传送门 @ (${x}, ${y}) → 世界地图`);
    }

    // 放置植物 (10-25个) - 避开NPC和传送门周围
    console.log('🌳 放置植物...');
    const numPlants = 10 + Math.floor(Math.random() * 16); // 10-25
    for (let i = 0; i < numPlants && plantItems.length > 0; i++) {
      const item = plantItems[Math.floor(Math.random() * plantItems.length)];
      let x: number = 0, y: number = 0;
      let attempts = 0;
      
      // 尝试找到不在禁区的位置
      do {
        x = margin + Math.floor(Math.random() * (config.width - margin * 2));
        y = margin + Math.floor(Math.random() * (config.height - margin * 2));
        
        const isBlocked = blockedPositions.some(pos => pos.x === x && pos.y === y);
        if (!isBlocked) break;
        
        attempts++;
      } while (attempts < 50);
      
      await db.insert(mapItems).values({
        mapId: mapRecord.id,
        itemId: item.id,
        x, y,
      });
    }
    console.log(`   ✅ 放置 ${numPlants} 个植物`);

    // 放置装饰物品 (5-10个) - 避开NPC和传送门周围
    console.log('🎨 放置装饰...');
    const numDecorations = 5 + Math.floor(Math.random() * 6); // 5-10
    for (let i = 0; i < numDecorations && decorationItems.length > 0; i++) {
      const item = decorationItems[Math.floor(Math.random() * decorationItems.length)];
      let x: number = 0, y: number = 0;
      let attempts = 0;
      
      // 尝试找到不在禁区的位置
      do {
        x = margin + Math.floor(Math.random() * (config.width - margin * 2));
        y = margin + Math.floor(Math.random() * (config.height - margin * 2));
        
        const isBlocked = blockedPositions.some(pos => pos.x === x && pos.y === y);
        if (!isBlocked) break;
        
        attempts++;
      } while (attempts < 50);
      
      await db.insert(mapItems).values({
        mapId: mapRecord.id,
        itemId: item.id,
        x, y,
      });
    }
    console.log(`   ✅ 放置 ${numDecorations} 个装饰物`);

    // 保存地形
    console.log('💾 保存地形...');
    const tileRecords = [];
    for (let y = 0; y < config.height; y++) {
      for (let x = 0; x < config.width; x++) {
        tileRecords.push({
          mapId: mapRecord.id,
          x, y,
          tileType: String(terrain[y][x]), // 转换为字符串
          walkable: terrain[y][x] !== TERRAIN.WATER,
        });
      }
    }
    await db.insert(mapTiles).values(tileRecords);
    console.log(`   ✅ 保存 ${tileRecords.length} 个瓦片`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 所有地图生成完成！');
  console.log('='.repeat(60));

  await client.end();
}

main().catch((error) => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
