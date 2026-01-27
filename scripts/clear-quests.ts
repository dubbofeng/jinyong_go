/**
 * 清空任务数据脚本
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function clearQuests() {
  const { db } = await import('../src/db/index');
  const { quests } = await import('../src/db/schema');

  console.log('🗑️  Clearing quests table...');

  try {
    // 删除任务表
    await db.delete(quests);
    console.log('✓ Cleared quests');

    console.log('✅ Quest table cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing table:', error);
    process.exit(1);
  }
}

clearQuests();
