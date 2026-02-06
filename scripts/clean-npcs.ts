/**
 * 清理数据库中的NPC数据
 */
import { db } from '../app/db';
import { mapItems } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function cleanNPCs() {
  console.log('🧹 开始清理NPC数据...\n');

  // 注意：mapItems表已更改为使用itemId引用items表，不再有itemName字段
  // 如需删除特定NPC，请先查询items表获取itemId，然后使用itemId删除
  // 示例：const result = await db.delete(mapItems).where(eq(mapItems.itemId, targetItemId));

  console.log('⚠️ 此脚本已过时，mapItems表结构已更改');
  console.log('✨ 如需清理NPC，请根据新的表结构更新此脚本');
}

cleanNPCs().catch(console.error);
