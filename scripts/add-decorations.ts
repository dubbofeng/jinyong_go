/**
 * 为场景地图添加随机装饰物
 */

import { db } from '../app/db';
import { maps, mapItems } from '../src/db/schema';
import { eq } from 'drizzle-orm';

// 装饰物配置
const DECORATIONS = {
  indoor: [
    // 室内装饰物（用于大厅、寺庙、茶馆）
    { name: '宝箱', path: '/game/isometric/items/chest01.png', blocking: true, size: 1 },
    { name: '宝箱', path: '/game/isometric/items/chest02.png', blocking: true, size: 1 },
    { name: '箱子', path: '/game/isometric/items/boxes01.png', blocking: true, size: 1 },
    { name: '箱子', path: '/game/isometric/items/boxes02.png', blocking: true, size: 1 },
    { name: '蘑菇', path: '/game/isometric/items/mushroom01.png', blocking: false, size: 1 },
    { name: '蘑菇', path: '/game/isometric/items/mushroom02.png', blocking: false, size: 1 },
    { name: '岩石', path: '/game/isometric/items/rocks01.png', blocking: true, size: 1 },
    { name: '岩石', path: '/game/isometric/items/rocks02.png', blocking: true, size: 1 },
    // 室内植物
    { name: '竹子', path: '/game/isometric/plants/bamboo01.png', blocking: true, size: 1 },
    { name: '竹子', path: '/game/isometric/plants/bamboo02.png', blocking: true, size: 1 },
    { name: '灌木', path: '/game/isometric/plants/bush01.png', blocking: true, size: 1 },
    { name: '灌木', path: '/game/isometric/plants/bush02.png', blocking: true, size: 1 },
    { name: '草丛', path: '/game/isometric/plants/grasses01.png', blocking: false, size: 1 },
    { name: '草丛', path: '/game/isometric/plants/grasses02.png', blocking: false, size: 1 },
    { name: '盆栽', path: '/game/isometric/plants/shrub1-01.png', blocking: true, size: 1 },
    { name: '盆栽', path: '/game/isometric/plants/shrub2-01.png', blocking: true, size: 1 },
  ],
  outdoor: [
    // 户外装饰物
    { name: '马车', path: '/game/isometric/items/carriage01.png', blocking: true, size: 2 },
    { name: '岩石', path: '/game/isometric/items/rocks03.png', blocking: true, size: 1 },
    { name: '岩石', path: '/game/isometric/items/rocks04.png', blocking: true, size: 1 },
    { name: '岩石', path: '/game/isometric/items/rocks05.png', blocking: true, size: 1 },
    { name: '蘑菇', path: '/game/isometric/items/mushroom03.png', blocking: false, size: 1 },
    { name: '蘑菇', path: '/game/isometric/items/mushroom04.png', blocking: false, size: 1 },
  ],
  plants: [
    // 植物装饰
    { name: '竹子', path: '/game/isometric/plants/bamboo03.png', blocking: true, size: 1 },
    { name: '竹子', path: '/game/isometric/plants/bamboo04.png', blocking: true, size: 1 },
    { name: '大树', path: '/game/isometric/plants/bigtree01.png', blocking: true, size: 2 },
    { name: '大树', path: '/game/isometric/plants/bigtree02.png', blocking: true, size: 2 },
    { name: '灌木', path: '/game/isometric/plants/bush03.png', blocking: true, size: 1 },
    { name: '灌木', path: '/game/isometric/plants/bush04.png', blocking: true, size: 1 },
    { name: '草丛', path: '/game/isometric/plants/grasses03.png', blocking: false, size: 1 },
    { name: '草丛', path: '/game/isometric/plants/grasses04.png', blocking: false, size: 1 },
    { name: '棕榈树', path: '/game/isometric/plants/palm01.png', blocking: true, size: 2 },
    { name: '棕榈树', path: '/game/isometric/plants/palm02.png', blocking: true, size: 2 },
    { name: '松树', path: '/game/isometric/plants/pine-full01.png', blocking: true, size: 2 },
    { name: '松树', path: '/game/isometric/plants/pine-full02.png', blocking: true, size: 2 },
    { name: '灌木丛', path: '/game/isometric/plants/shrub1-02.png', blocking: true, size: 1 },
    { name: '灌木丛', path: '/game/isometric/plants/shrub2-02.png', blocking: true, size: 1 },
    { name: '热带植物', path: '/game/isometric/plants/tropical01.png', blocking: true, size: 2 },
    { name: '热带植物', path: '/game/isometric/plants/tropical02.png', blocking: true, size: 2 },
    { name: '野草', path: '/game/isometric/plants/weed01.png', blocking: false, size: 1 },
    { name: '野草', path: '/game/isometric/plants/weed02.png', blocking: false, size: 1 },
  ],
  buildings: [
    // 西式建筑装饰（大型建筑）
    { name: '教堂', path: '/game/isometric/buildings/church/renders/idle/45/000.png', blocking: true, size: 4 },
    { name: '兵营', path: '/game/isometric/buildings/barracks/renders/idle/45/000.png', blocking: true, size: 4 },
    { name: '消防站', path: '/game/isometric/buildings/firestation/renders/idle/45/000.png', blocking: true, size: 4 },
    { name: '草药铺', path: '/game/isometric/buildings/herbary/renders/idle/45/000.png', blocking: true, size: 3 },
    { name: '武器铺', path: '/game/isometric/buildings/weaponsmith/renders/idle/45/000.png', blocking: true, size: 3 },
  ],
  chinese_buildings: [
    // 中式建筑装饰（大型建筑，需要更多空间）
    { name: '二层楼', path: '/game/isometric/chinese_buildings/2stories.png', blocking: true, size: 3 },
    { name: '祭坛', path: '/game/isometric/chinese_buildings/altar.png', blocking: true, size: 2 },
    { name: '建筑', path: '/game/isometric/chinese_buildings/building.png', blocking: true, size: 3 },
    { name: '马', path: '/game/isometric/chinese_buildings/horse.png', blocking: true, size: 2 },
    { name: '房屋', path: '/game/isometric/chinese_buildings/house.png', blocking: true, size: 3 },
    { name: '工坊', path: '/game/isometric/chinese_buildings/mechanic.png', blocking: true, size: 3 },
    { name: '老房子', path: '/game/isometric/chinese_buildings/old_house.png', blocking: true, size: 3 },
    { name: '宫殿', path: '/game/isometric/chinese_buildings/palace.png', blocking: true, size: 4 },
    { name: '平台', path: '/game/isometric/chinese_buildings/platform.png', blocking: true, size: 2 },
    { name: '商铺', path: '/game/isometric/chinese_buildings/shop.png', blocking: true, size: 3 },
    { name: '店铺1', path: '/game/isometric/chinese_buildings/shop1.png', blocking: true, size: 3 },
    { name: '店铺2', path: '/game/isometric/chinese_buildings/shop2.png', blocking: true, size: 3 },
    { name: '庭院', path: '/game/isometric/chinese_buildings/yard.png', blocking: true, size: 3 },
  ],
  animated: [
    // 动画建筑（信号火）
    { 
      name: '信号火', 
      path: '/game/isometric/buildings/signal_fire/renders/work/45/000.png',
      animationPath: '/game/isometric/buildings/signal_fire/renders/work/45',
      frameCount: 16,
      blocking: true,
      size: 2
    },
  ],
};

/**
 * 检查位置是否可以放置装饰物
 * 根据装饰物大小检查占用区域
 */
function canPlaceDecoration(
  x: number,
  y: number,
  size: number,
  width: number,
  height: number,
  existingItems: Array<{ x: number; y: number; size?: number }>,
): boolean {
  // 边界检查 - 根据物品大小留出足够边距
  const margin = Math.ceil(size / 2) + 1;
  if (x < margin || x >= width - margin || y < margin || y >= height - margin) {
    return false;
  }

  // 检查与现有物品的距离
  // 大型建筑需要更多空间，根据两个物品的size之和计算最小距离
  for (const item of existingItems) {
    const itemSize = item.size || 1;
    const requiredDistance = Math.max(size, itemSize) + 1; // 至少相隔1格
    
    const distance = Math.sqrt(Math.pow(x - item.x, 2) + Math.pow(y - item.y, 2));
    if (distance < requiredDistance) {
      return false;
    }
  }

  return true;
}

/**
 * 为地图添加随机装饰物
 */
async function addDecorationsToMap(
  mapId: string,
  mapName: string,
  decorationTypes: Array<'indoor' | 'outdoor' | 'plants' | 'buildings' | 'animated'>,
  count: number
) {
  console.log(`\n🎨 为 ${mapName} 添加装饰物...`);

  // 查找地图
  const [map] = await db.select().from(maps).where(eq(maps.mapId, mapId));
  if (!map) {
    console.error(`❌ 地图 ${mapId} 不存在`);
    return;
  }

  // 获取现有物品位置（包括大小信息）
  const existingItems = await db.select().from(mapItems).where(eq(mapItems.mapId, map.id));
  const occupiedPositions = existingItems.map(item => ({ 
    x: item.x, 
    y: item.y,
    size: 2 // 假设现有物品占用2格（NPC等）
  }));

  // 合并所有类型的装饰物
  const availableDecorations = decorationTypes.flatMap(type => DECORATIONS[type]);

  // 追踪已使用的建筑物（建筑物每个只能出现一次）
  const usedBuildings = new Set<string>();

  // 随机放置装饰物
  const decorationsToAdd: Array<{
    mapId: number;
    itemName: string;
    itemPath: string;
    itemType: string;
    x: number;
    y: number;
    blocking: boolean;
    size?: number;
  }> = [];

  let attempts = 0;
  const maxAttempts = count * 20; // 增加尝试次数，因为大型建筑需要更多尝试

  while (decorationsToAdd.length < count && attempts < maxAttempts) {
    attempts++;

    // 随机选择装饰物
    const decoration = availableDecorations[Math.floor(Math.random() * availableDecorations.length)];
    
    // 检查是否是建筑物（buildings 或 chinese_buildings 或 animated）
    const isBuilding = (
      (decorationTypes.includes('buildings') && DECORATIONS.buildings.some(b => b.path === decoration.path)) ||
      (decorationTypes.includes('chinese_buildings') && DECORATIONS.chinese_buildings.some(b => b.path === decoration.path)) ||
      (decorationTypes.includes('animated') && DECORATIONS.animated.some(b => b.path === decoration.path))
    );
    
    // 建筑物只能出现一次
    if (isBuilding && usedBuildings.has(decoration.path)) {
      continue; // 建筑物已存在，跳过
    }

    // 随机位置
    const x = Math.floor(Math.random() * map.width);
    const y = Math.floor(Math.random() * map.height);

    // 检查是否可以放置（使用装饰物的size）
    const allOccupied = [...occupiedPositions, ...decorationsToAdd.map(d => ({ 
      x: d.x, 
      y: d.y, 
      size: d.size || 1 
    }))];
    
    if (canPlaceDecoration(x, y, decoration.size, map.width, map.height, allOccupied)) {
      decorationsToAdd.push({
        mapId: map.id,
        itemName: decoration.name,
        itemPath: decoration.path,
        itemType: 'decoration',
        x,
        y,
        blocking: decoration.blocking,
        size: decoration.size,
      });

      // 如果是建筑物，标记为已使用（使用path作为唯一标识）
      if (isBuilding) {
        usedBuildings.add(decoration.path);
      }

      console.log(`  ✓ 添加 ${decoration.name} 在 (${x}, ${y}) [大小:${decoration.size}格]`);
    }
  }

  // 批量插入装饰物
  if (decorationsToAdd.length > 0) {
    await db.insert(mapItems).values(decorationsToAdd);
    console.log(`✅ 成功添加 ${decorationsToAdd.length} 个装饰物到 ${mapName}`);
  } else {
    console.log(`⚠️  没有找到合适的位置放置装饰物`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🎨 开始为场景地图添加装饰物...\n');

  try {
    // 华山 - 户外装饰 + 植物 + 中式建筑
    await addDecorationsToMap('huashan_hall', '华山', ['outdoor', 'plants', 'chinese_buildings'], 20);

    // 少林寺 - 户外装饰 + 植物 + 中式建筑 + 动画建筑
    await addDecorationsToMap('shaolin_temple', '少林寺', ['outdoor', 'plants', 'chinese_buildings', 'animated'], 20);

    // 襄阳城 - 户外装饰 + 植物 + 中式建筑
    await addDecorationsToMap('xiangyang_teahouse', '襄阳城', ['outdoor', 'plants', 'chinese_buildings'], 20);

    console.log('\n🎉 所有装饰物添加完成！');
  } catch (error) {
    console.error('❌ 添加装饰物失败:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
