import { db } from '@/app/db';
import { playerStats } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getExperienceForLevel } from './rank-system';

/**
 * 增加玩家经验值并自动处理升级
 * @param userId 用户ID
 * @param experienceGained 增加的经验值
 * @returns 升级信息 { leveledUp: boolean, oldLevel: number, newLevel: number, newExperience: number }
 */
export async function addExperience(
  userId: number | string,
  experienceGained: number
): Promise<{
  success: boolean;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newExperience: number;
  experienceToNext: number;
}> {
  if (experienceGained <= 0) {
    throw new Error('Experience gained must be positive');
  }

  const userIdNum = typeof userId === 'string' ? parseInt(userId) : userId;

  // 获取当前玩家数据
  const [player] = await db
    .select()
    .from(playerStats)
    .where(eq(playerStats.userId, userIdNum))
    .limit(1);

  if (!player) {
    throw new Error('Player not found');
  }

  const oldLevel = player.level;
  let newExperience = player.experience + experienceGained;
  let newLevel = player.level;
  let expToNext = player.experienceToNext || getExperienceForLevel(newLevel);
  let maxStamina = player.maxStamina;
  let maxQi = player.maxQi;

  // 检查是否升级（支持多级升级）
  while (newExperience >= expToNext && newLevel < 27) {
    newExperience -= expToNext;
    newLevel++;
    expToNext = getExperienceForLevel(newLevel);
    maxStamina += 10;
    maxQi += 10;
  }

  // 如果达到最高等级
  if (newLevel >= 27) {
    newExperience = 0;
    expToNext = 0;
  }

  // 更新数据库
  await db
    .update(playerStats)
    .set({
      experience: newExperience,
      level: newLevel,
      experienceToNext: expToNext,
      maxStamina,
      maxQi,
      updatedAt: new Date(),
    })
    .where(eq(playerStats.userId, userIdNum));

  return {
    success: true,
    leveledUp: newLevel > oldLevel,
    oldLevel,
    newLevel,
    newExperience,
    experienceToNext: expToNext,
  };
}

/**
 * 批量增加经验值和其他奖励
 * @param userId 用户ID
 * @param rewards 奖励内容 { experience?, silver?, stamina?, qi? }
 */
export async function addRewards(
  userId: number | string,
  rewards: {
    experience?: number;
    silver?: number;
    stamina?: number;
    qi?: number;
  }
) {
  const userIdNum = typeof userId === 'string' ? parseInt(userId) : userId;

  // 获取当前玩家数据
  const [player] = await db
    .select()
    .from(playerStats)
    .where(eq(playerStats.userId, userIdNum))
    .limit(1);

  if (!player) {
    throw new Error('Player not found');
  }

  const oldLevel = player.level;
  let newExperience = player.experience + (rewards.experience || 0);
  let newLevel = player.level;
  let expToNext = player.experienceToNext || getExperienceForLevel(newLevel);
  let maxStamina = player.maxStamina;
  let maxQi = player.maxQi;

  // 处理经验值升级
  if (rewards.experience && rewards.experience > 0) {
    while (newExperience >= expToNext && newLevel < 27) {
      newExperience -= expToNext;
      newLevel++;
      expToNext = getExperienceForLevel(newLevel);
      maxStamina += 10;
      maxQi += 10;
    }

    if (newLevel >= 27) {
      newExperience = 0;
      expToNext = 0;
    }
  }

  // 构建更新对象
  const updates: any = {
    updatedAt: new Date(),
  };

  if (rewards.experience) {
    updates.experience = newExperience;
    updates.level = newLevel;
    updates.experienceToNext = expToNext;
    updates.maxStamina = maxStamina;
    updates.maxQi = maxQi;
  }

  if (rewards.silver) {
    updates.silver = player.silver + rewards.silver;
  }

  if (rewards.stamina !== undefined) {
    updates.stamina = Math.min(maxStamina, player.stamina + rewards.stamina);
  }

  if (rewards.qi !== undefined) {
    updates.qi = Math.min(maxQi, player.qi + rewards.qi);
  }

  // 更新数据库
  await db
    .update(playerStats)
    .set(updates)
    .where(eq(playerStats.userId, userIdNum));

  return {
    success: true,
    leveledUp: newLevel > oldLevel,
    oldLevel,
    newLevel,
    newExperience,
    experienceToNext: expToNext,
  };
}
