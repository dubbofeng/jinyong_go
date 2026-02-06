import { eq } from 'drizzle-orm';
import { genSaltSync, hashSync } from 'bcrypt-ts';
import { db, users, gameProgress } from '../src/db';
import type { User } from '../src/db/schema';

// 重新导出 db 和 schema，以便其他模块可以从 @/app/db 导入
export { db } from '../src/db';
export * from '../src/db/schema';

export async function getUser(email: string) {
  const result = await db.select().from(users).where(eq(users.email, email));
  return result;
}

export async function createUser(email: string, password: string, username?: string) {
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

  // 为新用户创建初始游戏进度
  if (newUser) {
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
  }

  return newUser;
}

export async function getUserById(id: number): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user || null;
}
