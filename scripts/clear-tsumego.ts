/**
 * 清空死活题数据脚本
 */

import { config } from 'dotenv';

// 必须先加载环境变量
config({ path: '.env.local' });

import { db } from '../src/db';
import { tsumegoProblems, playerTsumegoRecords } from '../src/db/schema';

async function clearTables() {
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
