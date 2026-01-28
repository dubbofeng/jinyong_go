/**
 * 为所有场景地图生成内容
 * 包括：地形瓦片、建筑、装饰物、植物
 */

import 'dotenv/config';
import { db } from '../app/db';
import { maps, mapTiles, mapItems, items } from '../src/db/schema';
import { eq, ne } from 'drizzle-orm';

// 地图主题配置
const MAP_THEMES: Record<string, string> = {
  // 序章
  'daoguan_scene': 'temple',     // 道观 - 寺庙主题
  
  // 第一章 - 中原地区
  'huashan_scene': 'mountain',   // 华山 - 山地主题
  'shaolin_scene': 'temple',     // 少林寺 - 寺庙主题
  'xiangyang_scene': 'village',  // 襄阳城 - 村庄主题
  'wudang_scene': 'mountain',    // 武当山 - 山地主题
  
  // 第二章 - 西南地区
  'tianlong_scene': 'temple',    // 天龙寺 - 寺庙主题
  'wuliang_scene': 'forest',     // 无量山 - 森林主题
  'wanjie_scene': 'mountain',    // 万劫谷 - 山地主题
  
  // 第三章 - 江南地区
  'taohua_scene': 'forest',      // 桃花岛 - 森林主题
  'meizhuang_scene': 'village',  // 梅庄 - 村庄主题
  'haining_scene': 'river',      // 海宁 - 河流主题
  
  // 第四章 - 西域地区
  'kunlun_scene': 'mountain',    // 昆仑山 - 山地主题
  'guangming_scene': 'mountain', // 光明顶 - 山地主题
  
  // 第五章 - 终南山区域
  'zhongnan_scene': 'mountain',  // 终南山 - 山地主题
  'gumu_scene': 'forest',        // 古墓 - 森林主题
  'leigu_scene': 'mountain',     // 擂鼓山 - 山地主题
};

async function generateAllSceneMaps() {
  console.log('🎮 开始为所有场景地图生成内容...\n');

  // 获取所有场景地图（排除世界地图）
  const sceneMaps = await db.select()
    .from(maps)
    .where(ne(maps.mapId, 'world_map'))
    .orderBy(maps.chapter);

  console.log(`📍 找到 ${sceneMaps.length} 个场景地图\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const map of sceneMaps) {
    const theme = MAP_THEMES[map.mapId] || 'forest';
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🗺️  处理地图: ${map.name} (${map.mapId})`);
    console.log(`   主题: ${theme}, 尺寸: ${map.width}x${map.height}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      // 检查地图是否已有瓦片
      const existingTiles = await db.select()
        .from(mapTiles)
        .where(eq(mapTiles.mapId, map.id))
        .limit(1);

      if (existingTiles.length > 0) {
        console.log(`⚠️  地图已有瓦片数据，跳过生成`);
        skipCount++;
        continue;
      }

      // 调用 generate-complete-maps.ts 中的生成函数
      console.log(`📥 调用生成脚本...`);
      const { execSync } = await import('child_process');
      
      const command = `npx tsx scripts/generate-single-map.ts ${map.mapId} ${theme}`;
      console.log(`   执行命令: ${command}`);
      
      execSync(command, { 
        stdio: 'inherit',
        env: { ...process.env }
      });

      console.log(`✅ ${map.name} 生成完成`);
      successCount++;

    } catch (error) {
      console.error(`❌ ${map.name} 生成失败:`, error instanceof Error ? error.message : error);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 生成统计');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${successCount} 个地图`);
  console.log(`⚠️  跳过: ${skipCount} 个地图（已有数据）`);
  console.log(`❌ 失败: ${errorCount} 个地图`);
  console.log('');

  await db.$client.end();
  process.exit(errorCount > 0 ? 1 : 0);
}

generateAllSceneMaps().catch(error => {
  console.error('❌ 发生错误:', error);
  process.exit(1);
});
