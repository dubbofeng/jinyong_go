import 'dotenv/config';
import { db } from '../app/db';
import { maps } from '../src/db/schema';

/**
 * 创建新地图的脚本模板
 *
 * 注意：已有的地图应该使用 update-existing-maps.ts 更新
 * 此脚本仅用于创建全新的地图
 */

async function createNewMaps() {
  console.log('🗺️  开始创建新地图...\n');

  const mapsToCreate: Array<{
    mapId: string;
    name: string;
    description?: string;
    chapter?: number;
    minLevel?: number;
    worldX?: number;
    worldY?: number;
    imagePromptZh?: string;
    imagePromptEn?: string;
  }> = [
    // 在这里添加新地图数据
    // 示例：
    // {
    //   mapId: 'example_scene',
    //   name: '示例地图',
    //   description: '这是一个示例地图',
    //   chapter: 1,
    //   minLevel: 5,
    //   worldX: 10,
    //   worldY: 10,
    //   imagePromptZh: '等距视角游戏地图素材：示例建筑，完整的独立建筑，清晰边界，适合放置在游戏场景中。游戏美术资源。',
    //   imagePromptEn: 'Example building. Isometric view, game art style.'
    // }
  ];

  if (mapsToCreate.length === 0) {
    console.log('⚠️  没有要创建的地图');
    console.log('💡 提示：请在 mapsToCreate 数组中添加新地图数据');
    process.exit(0);
  }

  const existingMaps = await db.select().from(maps);
  console.log(`📋 数据库中已有 ${existingMaps.length} 个地图\n`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const mapData of mapsToCreate) {
    // 检查地图是否已存在
    const existing = existingMaps.find((m) => m.mapId === mapData.mapId);

    if (existing) {
      console.log(`  ⏭️  跳过：${mapData.name} (${mapData.mapId}) - 已存在`);
      skippedCount++;
      continue;
    }

    // 创建新地图（32x32，空地图）
    const newMap = await db
      .insert(maps)
      .values({
        mapId: mapData.mapId,
        name: mapData.name,
        mapType: 'scene',
        width: 32,
        height: 32,
        description: mapData.description,
        chapter: mapData.chapter,
        minLevel: mapData.minLevel,
        worldX: mapData.worldX,
        worldY: mapData.worldY,
        imagePromptZh: mapData.imagePromptZh,
        imagePromptEn: mapData.imagePromptEn,
        metadata: {
          description: mapData.description,
          chapter: mapData.chapter,
          minLevel: mapData.minLevel,
        },
      })
      .returning();

    console.log(
      `  ✅ 创建：${mapData.name} (${mapData.mapId}) - ID: ${newMap[0].id}, 世界坐标: (${mapData.worldX}, ${mapData.worldY})`
    );
    createdCount++;
  }

  console.log(`\n📊 统计信息：`);
  console.log(`  - 已创建：${createdCount} 个地图`);
  console.log(`  - 已跳过：${skippedCount} 个地图`);
  console.log(`  - 总计：${existingMaps.length + createdCount} 个地图`);

  console.log('\n✨ 完成！');

  process.exit(0);
}

createNewMaps().catch((error) => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
