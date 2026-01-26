/**
 * 为场景地图添加随机装饰物
 * 现在从items表动态加载装饰物定义
 */

import { db } from '../app/db';
import { maps, mapItems, items } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * 检查位置是否可以放置装饰物
 * 根据装饰物大小检查占用区域
 */
function canPlaceDecoration(
  x: number,
  y: number,
  size: number,
  mapWidth: number,
  mapHeight: number,
  occupiedPositions: { x: number; y: number; size: number }[]
): boolean {
  // 根据大小计算边距（越大的物体需要离边缘越远）
  const edgeMargin = Math.ceil(size / 2) + 1;

  // 检查是否太靠近边缘
  if (
    x < edgeMargin ||
    y < edgeMargin ||
    x >= mapWidth - edgeMargin ||
    y >= mapHeight - edgeMargin
  ) {
    return false;
  }

  // 检查与其他装饰物的距离（考虑两个物体的大小）
  for (const pos of occupiedPositions) {
    const itemSize = pos.size || 1;
    const minDistance = Math.max(size, itemSize) + 1; // 根据物品大小动态调整距离

    if (Math.abs(x - pos.x) < minDistance && Math.abs(y - pos.y) < minDistance) {
      return false;
    }
  }

  return true;
}

/**
 * 为地图添加装饰物
 */
async function addDecorationsToMap(
  mapId: string,
  mapName: string,
  categories: string[],
  count: number = 20
) {
  console.log(`\n🎨 正在为 ${mapName} 添加装饰物...`);

  // 查询地图数据（使用mapId字段而不是id）
  const [map] = await db.select().from(maps).where(eq(maps.mapId, mapId));
  if (!map) {
    console.log(`❌ 地图 ${mapId} 不存在`);
    return;
  }

  // 从items表加载所有可用的装饰物、植物、建筑
  const availableItems = await db
    .select()
    .from(items)
    .where(
      inArray(items.itemType, ['decoration', 'plant', 'building'])
    );

  console.log(`  📦 找到 ${availableItems.length} 个可用物品`);
  console.log(`  🔍 筛选类别: ${categories.join(', ')}`);

  // 按category分组
  const itemsByCategory: Record<string, typeof availableItems> = {};
  for (const item of availableItems) {
    const cat = item.category || 'other';
    if (!itemsByCategory[cat]) {
      itemsByCategory[cat] = [];
    }
    itemsByCategory[cat].push(item);
  }

  // 收集符合条件的装饰物
  const decorations: typeof availableItems = [];
  for (const category of categories) {
    if (itemsByCategory[category]) {
      decorations.push(...itemsByCategory[category]);
      console.log(`  ✓ ${category}: ${itemsByCategory[category].length} 个`);
    }
  }

  if (decorations.length === 0) {
    console.log(`  ⚠️  没有找到符合类别的装饰物`);
    return;
  }

  // 获取该地图已有的装饰物位置（避免重叠）
  // 需要JOIN items表获取size信息
  const existingItemsRaw = await db
    .select({
      x: mapItems.x,
      y: mapItems.y,
      size: items.size,
    })
    .from(mapItems)
    .leftJoin(items, eq(mapItems.itemId, items.id))
    .where(eq(mapItems.mapId, map.id)); // 使用integer类型的id

  const occupiedPositions = existingItemsRaw.map((item) => ({
    x: item.x,
    y: item.y,
    size: item.size || 1,
  }));

  console.log(`  📍 地图尺寸: ${map.width}x${map.height}`);
  console.log(`  🚧 已占用位置: ${occupiedPositions.length} 个`);

  // 跟踪建筑物使用情况（用imagePath作为唯一标识）
  const usedBuildings = new Set<string>();

  const decorationsToAdd: any[] = [];
  const maxAttempts = count * 100; // 最多尝试次数

  for (let attempt = 0; attempt < maxAttempts && decorationsToAdd.length < count; attempt++) {
    const decoration = decorations[Math.floor(Math.random() * decorations.length)];

    // 判断是否是建筑物（只能出现一次）
    const isBuilding = ['buildings', 'chinese_buildings', 'animated'].includes(decoration.category || '');

    // 建筑物只能出现一次
    if (isBuilding && usedBuildings.has(decoration.imagePath || '')) {
      continue; // 建筑物已存在，跳过
    }

    // 随机位置
    const x = Math.floor(Math.random() * map.width);
    const y = Math.floor(Math.random() * map.height);

    // 检查是否可以放置（使用装饰物的size）
    const allOccupied = [
      ...occupiedPositions,
      ...decorationsToAdd.map((d) => ({
        x: d.x,
        y: d.y,
        size: d.size || 1,
      })),
    ];

    if (canPlaceDecoration(x, y, decoration.size || 1, map.width, map.height, allOccupied)) {
      decorationsToAdd.push({
        mapId: map.id, // 使用integer类型的id
        itemId: decoration.id, // 引用items表的id
        x,
        y,
        // size字段存储在items表中，不需要在map_items中重复
      });

      // 如果是建筑物，标记为已使用（使用imagePath作为唯一标识）
      if (isBuilding) {
        usedBuildings.add(decoration.imagePath || '');
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
