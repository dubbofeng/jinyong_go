import { db } from '../app/db';
import { maps, mapTiles } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';

async function checkTileDistribution() {
  console.log('📊 检查华山传功厅的瓦片类型分布...\n');
  
  const map = await db.query.maps.findFirst({
    where: eq(maps.mapId, 'huashan_scene'),
  });
  
  if (!map) {
    console.error('❌ 找不到华山传功厅');
    return;
  }
  
  console.log(`地图: ${map.name} (ID: ${map.id})`);
  console.log(`尺寸: ${map.width}×${map.height} = ${map.width * map.height} 个瓦片\n`);
  
  // 统计每种瓦片类型的数量
  const distribution = await db
    .select({
      tileType: mapTiles.tileType,
      count: sql<number>`count(*)::int`,
    })
    .from(mapTiles)
    .where(eq(mapTiles.mapId, map.id))
    .groupBy(mapTiles.tileType);
  
  console.log('瓦片类型分布：');
  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  for (const item of distribution) {
    const percentage = ((item.count / total) * 100).toFixed(1);
    console.log(`  ${item.tileType}: ${item.count} (${percentage}%)`);
  }
  
  // 查看前10个瓦片的详细信息
  console.log('\n前10个瓦片示例：');
  const samples = await db
    .select()
    .from(mapTiles)
    .where(eq(mapTiles.mapId, map.id))
    .limit(10);
  
  for (const tile of samples) {
    console.log(`  (${tile.x}, ${tile.y}): ${tile.tileType}`);
  }
}

checkTileDistribution()
  .then(() => {
    console.log('\n✅ 检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 错误:', error);
    process.exit(1);
  });
