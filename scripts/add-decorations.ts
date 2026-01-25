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
    { name: '宝箱', path: '/game/isometric/items/chest01.png', blocking: true },
    { name: '宝箱', path: '/game/isometric/items/chest02.png', blocking: true },
    { name: '箱子', path: '/game/isometric/items/boxes01.png', blocking: true },
    { name: '箱子', path: '/game/isometric/items/boxes02.png', blocking: true },
    { name: '蘑菇', path: '/game/isometric/items/mushroom01.png', blocking: false },
    { name: '蘑菇', path: '/game/isometric/items/mushroom02.png', blocking: false },
    { name: '岩石', path: '/game/isometric/items/rocks01.png', blocking: true },
    { name: '岩石', path: '/game/isometric/items/rocks02.png', blocking: true },
    // 室内植物
    { name: '竹子', path: '/game/isometric/plants/bamboo01.png', blocking: true },
    { name: '竹子', path: '/game/isometric/plants/bamboo02.png', blocking: true },
    { name: '灌木', path: '/game/isometric/plants/bush01.png', blocking: true },
    { name: '灌木', path: '/game/isometric/plants/bush02.png', blocking: true },
    { name: '草丛', path: '/game/isometric/plants/grasses01.png', blocking: false },
    { name: '草丛', path: '/game/isometric/plants/grasses02.png', blocking: false },
    { name: '盆栽', path: '/game/isometric/plants/shrub1-01.png', blocking: true },
    { name: '盆栽', path: '/game/isometric/plants/shrub2-01.png', blocking: true },
  ],
  outdoor: [
    // 户外装饰物
    { name: '马车', path: '/game/isometric/items/carriage01.png', blocking: true },
    { name: '岩石', path: '/game/isometric/items/rocks03.png', blocking: true },
    { name: '岩石', path: '/game/isometric/items/rocks04.png', blocking: true },
    { name: '岩石', path: '/game/isometric/items/rocks05.png', blocking: true },
    { name: '蘑菇', path: '/game/isometric/items/mushroom03.png', blocking: false },
    { name: '蘑菇', path: '/game/isometric/items/mushroom04.png', blocking: false },
  ],
  plants: [
    // 植物装饰
    { name: '竹子', path: '/game/isometric/plants/bamboo03.png', blocking: true },
    { name: '竹子', path: '/game/isometric/plants/bamboo04.png', blocking: true },
    { name: '大树', path: '/game/isometric/plants/bigtree01.png', blocking: true },
    { name: '大树', path: '/game/isometric/plants/bigtree02.png', blocking: true },
    { name: '灌木', path: '/game/isometric/plants/bush03.png', blocking: true },
    { name: '灌木', path: '/game/isometric/plants/bush04.png', blocking: true },
    { name: '草丛', path: '/game/isometric/plants/grasses03.png', blocking: false },
    { name: '草丛', path: '/game/isometric/plants/grasses04.png', blocking: false },
    { name: '棕榈树', path: '/game/isometric/plants/palm01.png', blocking: true },
    { name: '棕榈树', path: '/game/isometric/plants/palm02.png', blocking: true },
    { name: '松树', path: '/game/isometric/plants/pine-full01.png', blocking: true },
    { name: '松树', path: '/game/isometric/plants/pine-full02.png', blocking: true },
    { name: '灌木丛', path: '/game/isometric/plants/shrub1-02.png', blocking: true },
    { name: '灌木丛', path: '/game/isometric/plants/shrub2-02.png', blocking: true },
    { name: '热带植物', path: '/game/isometric/plants/tropical01.png', blocking: true },
    { name: '热带植物', path: '/game/isometric/plants/tropical02.png', blocking: true },
    { name: '野草', path: '/game/isometric/plants/weed01.png', blocking: false },
    { name: '野草', path: '/game/isometric/plants/weed02.png', blocking: false },
  ],
  buildings: [
    // 西式建筑装饰
    { name: '教堂', path: '/game/isometric/buildings/church/renders/idle/45/000.png', blocking: true },
    { name: '兵营', path: '/game/isometric/buildings/barracks/renders/idle/45/000.png', blocking: true },
    { name: '消防站', path: '/game/isometric/buildings/firestation/renders/idle/45/000.png', blocking: true },
    { name: '草药铺', path: '/game/isometric/buildings/herbary/renders/idle/45/000.png', blocking: true },
    { name: '武器铺', path: '/game/isometric/buildings/weaponsmith/renders/idle/45/000.png', blocking: true },
  ],
  chinese_buildings: [
    // 中式建筑装饰
    { name: '二层楼', path: '/game/isometric/chinese_buildings/2stories.png', blocking: true },
    { name: '祭坛', path: '/game/isometric/chinese_buildings/altar.png', blocking: true },
    { name: '建筑', path: '/game/isometric/chinese_buildings/building.png', blocking: true },
    { name: '马', path: '/game/isometric/chinese_buildings/horse.png', blocking: true },
    { name: '房屋', path: '/game/isometric/chinese_buildings/house.png', blocking: true },
    { name: '工坊', path: '/game/isometric/chinese_buildings/mechanic.png', blocking: true },
    { name: '老房子', path: '/game/isometric/chinese_buildings/old_house.png', blocking: true },
    { name: '宫殿', path: '/game/isometric/chinese_buildings/palace.png', blocking: true },
    { name: '平台', path: '/game/isometric/chinese_buildings/platform.png', blocking: true },
    { name: '商铺', path: '/game/isometric/chinese_buildings/shop.png', blocking: true },
    { name: '店铺1', path: '/game/isometric/chinese_buildings/shop1.png', blocking: true },
    { name: '店铺2', path: '/game/isometric/chinese_buildings/shop2.png', blocking: true },
    { name: '庭院', path: '/game/isometric/chinese_buildings/yard.png', blocking: true },
  ],
  animated: [
    // 动画建筑（信号火）
    { 
      name: '信号火', 
      path: '/game/isometric/buildings/signal_fire/renders/work/45/000.png',
      animationPath: '/game/isometric/buildings/signal_fire/renders/work/45',
      frameCount: 16,
      blocking: true 
    },
  ],
};

/**
 * 检查位置是否可以放置装饰物
 */
function canPlaceDecoration(
  x: number,
  y: number,
  width: number,
  height: number,
  existingItems: Array<{ x: number; y: number }>,
  minDistance: number = 2
): boolean {
  // 边界检查
  if (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) {
    return false;
  }

  // 检查与现有物品的距离
  for (const item of existingItems) {
    const distance = Math.sqrt(Math.pow(x - item.x, 2) + Math.pow(y - item.y, 2));
    if (distance < minDistance) {
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

  // 获取现有物品位置
  const existingItems = await db.select().from(mapItems).where(eq(mapItems.mapId, map.id));
  const occupiedPositions = existingItems.map(item => ({ x: item.x, y: item.y }));

  // 合并所有类型的装饰物
  const availableDecorations = decorationTypes.flatMap(type => DECORATIONS[type]);

  // 随机放置装饰物
  const decorationsToAdd: Array<{
    mapId: number;
    itemName: string;
    itemPath: string;
    itemType: string;
    x: number;
    y: number;
    blocking: boolean;
  }> = [];

  let attempts = 0;
  const maxAttempts = count * 10; // 避免无限循环

  while (decorationsToAdd.length < count && attempts < maxAttempts) {
    attempts++;

    // 随机选择装饰物
    const decoration = availableDecorations[Math.floor(Math.random() * availableDecorations.length)];

    // 随机位置
    const x = Math.floor(Math.random() * map.width);
    const y = Math.floor(Math.random() * map.height);

    // 检查是否可以放置
    if (canPlaceDecoration(x, y, map.width, map.height, [...occupiedPositions, ...decorationsToAdd])) {
      decorationsToAdd.push({
        mapId: map.id,
        itemName: decoration.name,
        itemPath: decoration.path,
        itemType: 'decoration',
        x,
        y,
        blocking: decoration.blocking,
      });

      console.log(`  ✓ 添加 ${decoration.name} 在 (${x}, ${y})`);
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
