import 'dotenv/config';
import { db } from '../src/db';

async function resetSequences() {
  try {
    console.log('🔧 正在修复数据库序列...');

    // 修复 users 表的序列
    await db.execute`
      SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);
    `;
    console.log('✅ users_id_seq 已修复');

    // 修复 game_progress 表的序列
    await db.execute`
      SELECT setval('game_progress_id_seq', COALESCE((SELECT MAX(id) FROM game_progress), 1), true);
    `;
    console.log('✅ game_progress_id_seq 已修复');

    // 修复 chess_records 表的序列
    await db.execute`
      SELECT setval('chess_records_id_seq', COALESCE((SELECT MAX(id) FROM chess_records), 1), true);
    `;
    console.log('✅ chess_records_id_seq 已修复');

    // 修复 npcs 表的序列
    await db.execute`
      SELECT setval('npcs_id_seq', COALESCE((SELECT MAX(id) FROM npcs), 1), true);
    `;
    console.log('✅ npcs_id_seq 已修复');

    console.log('🎉 所有序列已修复！');
  } catch (error) {
    console.error('❌ 修复序列时出错:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

resetSequences();
