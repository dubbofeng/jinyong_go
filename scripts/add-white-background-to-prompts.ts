import 'dotenv/config';
import { db } from '../app/db';
import { maps } from '../src/db/schema';
import { ne, eq } from 'drizzle-orm';

/**
 * 为所有地图的英文提示词添加白色背景要求
 */

async function addWhiteBackgroundToPrompts() {
  console.log('🎨 开始为所有地图提示词添加白色背景要求...\n');

  // 查询所有小地图（除了 world_map）
  const sceneMaps = await db
    .select()
    .from(maps)
    .where(ne(maps.mapId, 'world_map'));

  console.log(`📋 找到 ${sceneMaps.length} 个地图\n`);

  let updatedCount = 0;

  for (const map of sceneMaps) {
    if (!map.imagePromptEn) {
      console.log(`⏭️  跳过 ${map.name}: 没有英文提示词`);
      continue;
    }

    // 检查是否已经包含白色背景要求
    if (map.imagePromptEn.toLowerCase().includes('white background')) {
      console.log(`⏭️  跳过 ${map.name}: 已包含白色背景要求`);
      continue;
    }

    // 在提示词末尾添加白色背景要求
    const updatedPrompt = `${map.imagePromptEn.trim()} IMPORTANT: Pure white background (#FFFFFF), isolated game asset suitable for transparent background removal.`;

    await db
      .update(maps)
      .set({
        imagePromptEn: updatedPrompt,
        updatedAt: new Date()
      })
      .where(eq(maps.id, map.id));

    console.log(`✅ 更新 ${map.name}`);
    console.log(`   旧: ${map.imagePromptEn.substring(0, 80)}...`);
    console.log(`   新: ${updatedPrompt.substring(0, 80)}...\n`);

    updatedCount++;
  }

  console.log('✨ 更新完成！\n');
  console.log('📊 统计信息：');
  console.log(`  - 已更新：${updatedCount} 个地图`);
  console.log(`  - 总计：${sceneMaps.length} 个地图\n`);

  console.log('💡 提示：');
  console.log('  - 所有地图的英文提示词已添加白色背景要求');
  console.log('  - 重新生成图片时会使用更新后的提示词');
  console.log('  - 生成的图片会自动去除白色背景');

  process.exit(0);
}

addWhiteBackgroundToPrompts().catch(error => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
