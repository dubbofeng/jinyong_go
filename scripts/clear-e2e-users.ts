/**
 * 清理 E2E 测试用户及其相关数据
 * 删除所有 username 以 "e2e" 开头的用户，并清空其关联表数据
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { inArray, like } from 'drizzle-orm';
import {
  users,
  gameProgress,
  chessRecords,
  playerStats,
  playerSkills,
  storyProgress,
  playerInventory,
  questProgress,
  npcRelationships,
  gameSettings,
  playerTsumegoRecords,
  playerAchievements,
} from '../src/db/schema';

config({ path: resolve(process.cwd(), '.env.local') });

async function clearE2EUsers() {
  console.log('🧹 开始清理 E2E 测试用户数据...');

  const { db } = await import('../src/db');

  const e2eUsers = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(like(users.username, 'e2e%'));

  if (e2eUsers.length === 0) {
    console.log('✅ 未找到以 e2e 开头的用户，无需清理。');
    return;
  }

  const userIds = e2eUsers.map(user => user.id);
  const usernames = e2eUsers.map(user => user.username).filter(Boolean).join(', ');

  console.log(`🔍 找到 ${userIds.length} 个测试用户: ${usernames || '(无用户名)'}`);

  // 先删子表，再删 users
  await db.delete(playerAchievements).where(inArray(playerAchievements.userId, userIds));
  await db.delete(playerTsumegoRecords).where(inArray(playerTsumegoRecords.userId, userIds));
  await db.delete(gameSettings).where(inArray(gameSettings.userId, userIds));
  await db.delete(npcRelationships).where(inArray(npcRelationships.userId, userIds));
  await db.delete(questProgress).where(inArray(questProgress.userId, userIds));
  await db.delete(playerInventory).where(inArray(playerInventory.userId, userIds));
  await db.delete(storyProgress).where(inArray(storyProgress.userId, userIds));
  await db.delete(playerSkills).where(inArray(playerSkills.userId, userIds));
  await db.delete(playerStats).where(inArray(playerStats.userId, userIds));
  await db.delete(chessRecords).where(inArray(chessRecords.userId, userIds));
  await db.delete(gameProgress).where(inArray(gameProgress.userId, userIds));

  await db.delete(users).where(inArray(users.id, userIds));

  console.log('✅ E2E 测试用户及相关数据已清理完成。');
}

clearE2EUsers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ 清理失败:', error);
    process.exit(1);
  });
