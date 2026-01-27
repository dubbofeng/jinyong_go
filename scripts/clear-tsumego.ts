/**
 * 清空死活题数据脚本
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// 必须先加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

async function clearTables() {
  // 动态导入db，确保环境变量已加载
  const { db } = await import('../src/db/index');
  const { tsumegoProblems, playerTsumegoRecords } = await import('../src/db/schema');
  
  console.log('🗑️  Clearing tsumego tables...');
  
  try {
    // 先删除记录表（有外键约束）
    await db.delete(playerTsumegoRecords);
    console.log('✓ Cleared player_tsumego_records');
    
    // 再删除题目表
    await db.delete(tsumegoProblems);
    console.log('✓ Cleared tsumego_problems');
    
    console.log('✅ All tables cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing tables:', error);
    process.exit(1);
  }
}

clearTables();
