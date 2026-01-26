/**
 * 重建items表和map_items表的脚本
 * 警告：会删除decoration_definitions表和重建items/map_items表
 */

import { db } from '../app/db';
import { sql } from 'drizzle-orm';

async function recreateTables() {
  console.log('⚠️  警告：即将删除并重建表，所有数据将丢失！');
  
  try {
    // 1. 删除decoration_definitions表
    console.log('\n🗑️  删除 decoration_definitions 表...');
    await db.execute(sql`DROP TABLE IF EXISTS decoration_definitions CASCADE`);
    
    // 2. 删除map_items表 (因为它依赖items)
    console.log('🗑️  删除 map_items 表...');
    await db.execute(sql`DROP TABLE IF EXISTS map_items CASCADE`);
    
    // 3. 删除旧的items表
    console.log('🗑️  删除旧的 items 表...');
    await db.execute(sql`DROP TABLE IF EXISTS items CASCADE`);
    
    console.log('\n✅ 表删除完成！');
    console.log('\n请运行以下命令重建表：');
    console.log('  npx dotenv-cli -e .env.local -- npx drizzle-kit push');
    
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

recreateTables()
  .then(() => {
    console.log('\n✨ 完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 错误:', error);
    process.exit(1);
  });
