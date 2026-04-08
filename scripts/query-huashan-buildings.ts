/**
 * 查询华山地图上的所有建筑物
 */
import { db } from '../app/db';
import { maps, mapItems, items } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

async function queryHuashanBuildings() {
  try {
    console.log('🏛️  查询华山地图上的建筑物...\n');

    // 查询 huashan_scene 和 huashan_hall 地图
    const mapNames = ['huashan_scene', 'huashan_hall'];
    const allBuildings: any[] = [];

    for (const mapName of mapNames) {
      console.log(`\n📍 正在查询地图: ${mapName}`);

      // 查询地图
      const [map] = await db.select().from(maps).where(eq(maps.mapId, mapName)).limit(1);

      if (!map) {
        console.log(`  ⚠️  地图 ${mapName} 不存在`);
        continue;
      }

      console.log(`  ✓ 地图ID: ${map.id}, 名称: ${map.name}`);
      console.log(`  ✓ 地图尺寸: ${map.width}x${map.height}`);

      // 查询该地图上所有category为建筑相关的物品
      const mapItemsData = await db
        .select({
          mapItemId: mapItems.id,
          itemId: mapItems.itemId,
          x: mapItems.x,
          y: mapItems.y,
          enabled: mapItems.enabled,
          itemName: items.name,
          itemName_en: items.nameEn,
          itemType: items.itemType,
          category: items.category,
          imagePath: items.imagePath,
          size: items.size,
          blocking: items.blocking,
          description: items.description,
        })
        .from(mapItems)
        .leftJoin(items, eq(mapItems.itemId, items.id))
        .where(eq(mapItems.mapId, map.id));

      console.log(`  📊 该地图上共有 ${mapItemsData.length} 个物品`);

      // 筛选建筑物（category 包含 building 或 item_type 是 building）
      const buildings = mapItemsData.filter((item) => {
        return (
          item.itemType === 'building' ||
          (item.category &&
            (item.category.includes('building') || item.category.includes('chinese')))
        );
      });

      console.log(`\n🏢 该地图上的建筑物 (共 ${buildings.length} 个):`);
      console.log('═'.repeat(80));

      buildings.forEach((building, index) => {
        console.log(
          `\n  ${index + 1}. ${building.itemName} ${building.itemName_en ? `(${building.itemName_en})` : ''}`
        );
        console.log(`     ID: ${building.itemId}`);
        console.log(`     位置: (${building.x}, ${building.y})`);
        console.log(`     类型: ${building.itemType}`);
        console.log(`     分类: ${building.category}`);
        console.log(`     大小: ${building.size} 格`);
        console.log(`     图片: ${building.imagePath}`);
        console.log(`     阻挡: ${building.blocking ? '是' : '否'}`);
        console.log(`     启用: ${building.enabled ? '是' : '否'}`);
        if (building.description) {
          console.log(`     描述: ${building.description}`);
        }

        allBuildings.push({
          mapId: mapName,
          index: index + 1,
          itemId: building.itemId,
          name: building.itemName,
          nameEn: building.itemName_en,
          position: { x: building.x, y: building.y },
          type: building.itemType,
          category: building.category,
          size: building.size,
          imagePath: building.imagePath,
          blocking: building.blocking,
          enabled: building.enabled,
          description: building.description,
        });
      });

      console.log('\n' + '═'.repeat(80));

      // 显示所有其他物品的统计
      const nonBuildings = mapItemsData.filter((item) => {
        return (
          item.itemType !== 'building' &&
          (!item.category ||
            !(item.category.includes('building') || item.category.includes('chinese')))
        );
      });

      if (nonBuildings.length > 0) {
        console.log(`\n📦 其他物品 (共 ${nonBuildings.length} 个):`);
        const categoryCount: Record<string, number> = {};
        nonBuildings.forEach((item) => {
          const cat = item.category || item.itemType;
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
        Object.entries(categoryCount).forEach(([cat, count]) => {
          console.log(`  - ${cat}: ${count} 个`);
        });
      }
    }

    // 汇总输出
    console.log('\n\n📋 华山地图建筑物完整列表 (JSON格式)');
    console.log('═'.repeat(80));
    console.log(JSON.stringify(allBuildings, null, 2));

    console.log('\n✅ 查询完成！');
  } catch (error) {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  }

  process.exit(0);
}

queryHuashanBuildings();
