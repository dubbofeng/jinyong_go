import 'dotenv/config';
import { db } from '../app/db';
import { maps, mapItems, items } from '../src/db/schema';
import { eq, ne, and, isNotNull, inArray } from 'drizzle-orm';

/**
 * 清空世界地图上的所有建筑和传送门（map_items表）
 * 然后根据所有小地图的坐标和生成的等距图，创建新的传送门
 */

async function updateWorldMapPortals() {
  console.log('🗺️  开始更新世界地图传送门...\n');

  // 1. 查询世界地图
  const [worldMap] = await db
    .select()
    .from(maps)
    .where(eq(maps.mapId, 'world_map'));

  if (!worldMap) {
    console.error('❌ 未找到世界地图');
    process.exit(1);
  }

  console.log(`📋 世界地图 ID: ${worldMap.id}\n`);

  // 2. 删除世界地图上的所有建筑和传送门（map_items 表）
  console.log('🗑️  清除世界地图上的建筑和传送门...');
  
  // 查询世界地图上所有的 map_items
  const existingMapItems = await db
    .select({
      id: mapItems.id,
      itemId: mapItems.itemId,
      x: mapItems.x,
      y: mapItems.y,
      itemType: items.itemType,
      itemName: items.name
    })
    .from(mapItems)
    .innerJoin(items, eq(mapItems.itemId, items.id))
    .where(eq(mapItems.mapId, worldMap.id));

  console.log(`  找到 ${existingMapItems.length} 个物品`);

  // 筛选出建筑和传送门
  const itemsToDelete = existingMapItems.filter(
    item => item.itemType === 'building' || item.itemType === 'portal'
  );

  if (itemsToDelete.length > 0) {
    console.log(`  准备删除 ${itemsToDelete.length} 个建筑/传送门:`);
    itemsToDelete.forEach(item => {
      console.log(`    - ${item.itemName} (${item.itemType}) at (${item.x}, ${item.y})`);
    });

    await db
      .delete(mapItems)
      .where(
        inArray(
          mapItems.id,
          itemsToDelete.map(item => item.id)
        )
      );
    console.log('  ✅ 已删除\n');
  } else {
    console.log('  ⚠️  没有需要删除的建筑/传送门\n');
  }

  // 3. 查询或创建一个通用的传送门 item
  let [portalItem] = await db
    .select()
    .from(items)
    .where(eq(items.itemId, 'world_portal'))
    .limit(1);

  if (!portalItem) {
    console.log('🔧 创建通用传送门 item...');
    const [newPortal] = await db
      .insert(items)
      .values({
        itemId: 'world_portal',
        name: '传送门',
        nameEn: 'Portal',
        description: '通往各地的传送门',
        descriptionEn: 'Portal to various locations',
        itemType: 'portal',
        category: 'world',
        rarity: 'common',
        imagePath: '/game/portal.png', // 默认图标
        size: 2,
        blocking: false,
        interactable: true,
        enterable: true,
        price: 0,
        sellPrice: 0
      })
      .returning();
    portalItem = newPortal;
    console.log('  ✅ 已创建\n');
  } else {
    console.log('  ✅ 找到已有的传送门 item\n');
  }

  // 4. 查询所有小地图（除了 world_map）
  const sceneMaps = await db
    .select()
    .from(maps)
    .where(
      and(
        ne(maps.mapId, 'world_map'),
        isNotNull(maps.worldX),
        isNotNull(maps.worldY)
      )
    );

  console.log(`📍 找到 ${sceneMaps.length} 个小地图:\n`);

  // 5. 为每个小地图创建传送门
  let createdCount = 0;
  let withImageCount = 0;

  for (const map of sceneMaps) {
    const hasImage = map.isometricImage && map.isometricImage.trim() !== '';
    
    console.log(`  ${hasImage ? '✅' : '⚠️ '} ${map.name} (${map.mapId})`);
    console.log(`     坐标: (${map.worldX}, ${map.worldY})`);
    console.log(`     图片: ${map.isometricImage || '未生成'}`);
    console.log(`     章节: 第${map.chapter === 0 ? '序' : map.chapter}章, 等级: ${map.minLevel}`);

    // 创建 map_items 记录
    await db.insert(mapItems).values({
      mapId: worldMap.id,
      itemId: portalItem.id,
      x: map.worldX!,
      y: map.worldY!,
      sceneLinkMapId: map.mapId, // 关键：设置传送目标
      sceneLinkX: 16, // 传送到目标地图的中心
      sceneLinkY: 16,
      enabled: true
    });

    console.log(`     ✅ 已创建传送门\n`);
    
    createdCount++;
    if (hasImage) withImageCount++;
  }

  console.log('✨ 更新完成！\n');
  console.log('📊 统计信息：');
  console.log(`  - 已清除建筑/传送门：${itemsToDelete.length} 个`);
  console.log(`  - 已创建传送门：${createdCount} 个`);
  console.log(`  - 有等距图的地图：${withImageCount} 个`);
  console.log(`  - 等待生成图片：${createdCount - withImageCount} 个\n`);

  console.log('💡 提示：');
  console.log('  - 传送门位置基于地图的 worldX 和 worldY 坐标');
  console.log('  - 传送门通过 scene_link_map_id 关联到目标地图');
  console.log('  - 在游戏中，传送门应该显示对应地图的等距图');
  console.log('  - 可以在游戏中访问世界地图查看效果');

  process.exit(0);
}

updateWorldMapPortals().catch(error => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
