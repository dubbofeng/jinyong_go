/**
 * 清理数据库中的NPC数据
 */
import { db } from '../app/db';
import { mapItems } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function cleanNPCs() {
  console.log('🧹 开始清理NPC数据...\n');

  // 删除欧阳锋
  const result = await db.delete(mapItems).where(eq(mapItems.itemName, '欧阳锋'));
  console.log('✅ 已从数据库删除: 欧阳锋');

  console.log('\n✨ 清理完成！');
}

cleanNPCs().catch(console.error);
