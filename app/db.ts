import { eq } from 'drizzle-orm';
import { genSaltSync, hashSync } from 'bcrypt-ts';
import { db, users, gameProgress, playerStats } from '../src/db';
import type { User } from '../src/db/schema';

// 重新导出 db 和 schema，以便其他模块可以从 @/app/db 导入
export { db } from '../src/db';
export * from '../src/db/schema';

export async function getUser(email: string) {
  const result = await db.select().from(users).where(eq(users.email, email));
  return result;
}

// 围棋等级到rating的映射函数
function goLevelToRating(level: string): number {
  const mapping: Record<string, number> = {
    '18k': 5,
    '17k': 10,
    '16k': 13,
    '15k': 16,
    '14k': 19,
    '13k': 22,
    '12k': 25,
    '11k': 28,
    '10k': 31,
    '9k': 34,
    '8k': 37,
    '7k': 40,
    '6k': 43,
    '5k': 46,
    '4k': 49,
    '3k': 52,
    '2k': 55,
    '1k': 58,
    '1d': 62,
    '2d': 66,
    '3d': 70,
    '4d': 75,
    '5d': 80,
    '6d': 85,
    '7d': 90,
    '8d': 95,
    '9d': 100,
  };
  return mapping[level] || 5; // 默认18k
}

export async function createUser(email: string, password: string, username?: string, goLevel?: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  // 创建用户
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      password: hash,
      username: username || email.split('@')[0],
    })
    .returning();

  // 为新用户创建初始游戏进度和属性
  if (newUser) {
    // 创建游戏进度
    await db.insert(gameProgress).values({
      userId: newUser.id,
      playerName: username || email.split('@')[0],
      currentMap: 'daoguan_scene',
      currentX: 0,
      currentY: 0,
      currentChapter: 1,
      completedTasks: [],
      activeQuests: [],
      completedQuests: [],
      skillPoints: 0,
    });

    // 创建玩家属性（包括围棋水平rating）
    const goSkillRating = goLevel ? goLevelToRating(goLevel) : 5; // 默认18k
    await db.insert(playerStats).values({
      userId: newUser.id,
      level: 1,
      experience: 0,
      experienceToNext: 100,
      stamina: 100,
      maxStamina: 100,
      staminaRegenRate: 1,
      qi: 100,
      maxQi: 100,
      qiRegenRate: 2,
      coins: 0,
      silver: 100,
      goSkillRating,
    });
  }

  return newUser;
}

export async function getUserById(id: number): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user || null;
}
