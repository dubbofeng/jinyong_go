/**
 * 更新 chinese_buildings 物品定义
 * 根据旧的 imagePath 找到记录并更新
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// 加载 .env.local（必须在导入 db 之前）
config({ path: resolve(process.cwd(), '.env.local') });

async function updateChineseBuildings() {
  // 动态导入以确保环境变量已加载
  const { db } = await import('../app/db');
  const { items } = await import('../src/db/schema');
  const { eq } = await import('drizzle-orm');

  console.log('🔄 开始更新 chinese_buildings 物品定义...\n');

  // 定义需要更新的映射关系（旧路径 -> 新配置）
  const updates = [
    {
      oldPath: '/game/isometric/chinese_buildings/2stories.png',
      newData: {
        itemId: 'small_2stories',
        name: '小型二层楼',
        imagePath: '/game/isometric/chinese_buildings/small_2stories.png',
      }
    },
    {
      oldPath: '/game/isometric/chinese_buildings/building.png',
      newData: {
        itemId: 'repair_building',
        name: '修缮建筑',
        description: '正在修缮的建筑',
        imagePath: '/game/isometric/chinese_buildings/repair_building.png',
      }
    },
    {
      oldPath: '/game/isometric/chinese_buildings/horse.png',
      newData: {
        itemId: 'stable',
        name: '马厩',
        imagePath: '/game/isometric/chinese_buildings/stable.png',
      }
    },
    {
      oldPath: '/game/isometric/chinese_buildings/shop2.png',
      newData: {
        itemId: 'pharmacy',
        name: '药铺',
        description: '中药铺，可以购买药材和丹药',
        rarity: 'uncommon',
        imagePath: '/game/isometric/chinese_buildings/pharmacy.png',
      }
    },
  ];

  let updateCount = 0;
  let notFoundCount = 0;

  for (const update of updates) {
    try {
      // 查找旧记录
      const existingItems = await db
        .select()
        .from(items)
        .where(eq(items.imagePath, update.oldPath))
        .limit(1);

      if (existingItems.length === 0) {
        console.log(`⚠️  未找到: ${update.oldPath}`);
        notFoundCount++;
        continue;
      }

      const existingItem = existingItems[0];
      
      // 更新记录
      await db
        .update(items)
        .set(update.newData as any)
        .where(eq(items.id, existingItem.id));

      console.log(`✅ 更新: ${existingItem.name} → ${update.newData.name}`);
      console.log(`   旧ID: ${existingItem.itemId} → 新ID: ${update.newData.itemId}`);
      console.log(`   路径: ${update.oldPath}`);
      console.log(`      → ${update.newData.imagePath}\n`);
      updateCount++;
    } catch (error) {
      console.error(`❌ 更新失败: ${update.oldPath}`, error);
    }
  }

  console.log(`\n🎉 完成！`);
  console.log(`  ✅ 成功更新: ${updateCount} 个`);
  console.log(`  ⚠️  未找到: ${notFoundCount} 个`);
}

updateChineseBuildings()
  .then(() => {
    console.log('\n✨ 更新完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 错误:', error);
    process.exit(1);
  });
