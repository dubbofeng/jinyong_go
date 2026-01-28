import { db } from '../app/db';
import { maps } from '../src/db/schema';
import { sql } from 'drizzle-orm';

async function checkMaps() {
  console.log('📋 查询数据库中的所有地图...\n');
  
  try {
    const allMaps = await db.select().from(maps);
    
    console.log(`找到 ${allMaps.length} 个地图：\n`);
    
    for (const map of allMaps) {
      console.log('地图信息：');
      console.log(`  ID (数字): ${map.id}`);
      console.log(`  Map ID (字符串): ${map.mapId}`);
      console.log(`  名称: ${map.name}`);
      console.log(`  类型: ${map.mapType}`);
      console.log(`  尺寸: ${map.width}×${map.height}`);
      console.log(`  编辑链接: http://localhost:9999/zh/admin/maps/${map.mapId}/edit`);
      console.log('');
    }
    
    // 测试API查询
    console.log('\n🔍 测试API查询逻辑...\n');
    const testMapId = 'huashan_scene';
    const result = await db.select().from(maps).where(sql`${maps.mapId} = ${testMapId}`);
    console.log(`查询 mapId='${testMapId}' 结果:`, result.length > 0 ? '找到' : '未找到');
    if (result.length > 0) {
      console.log('找到的地图:', result[0]);
    }
  } catch (error) {
    console.error('查询出错:', error);
  }
}

checkMaps()
  .then(() => {
    console.log('\n✅ 检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 错误:', error);
    process.exit(1);
  });
