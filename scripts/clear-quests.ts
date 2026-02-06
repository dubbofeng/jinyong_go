/**
 * 清空任务进度数据脚本
 * 注意：任务系统已重构，quests表已移除，现在使用questProgress表
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function clearQuests() {
  const { db } = await import('../src/db/index');
  const { questProgress } = await import('../src/db/schema');

  console.log('🗑️  Clearing quest progress table...');

  try {
    // 删除任务进度表
    await db.delete(questProgress);
    console.log('✓ Cleared questProgress');

    console.log('✅ Quest progress table cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing table:', error);
    process.exit(1);
  }
}

clearQuests();
