/**
 * 为现有用户初始化新数据
 * 创建玩家属性、技能、游戏设置等
 */

import { db } from '../src/db';
import { users, playerStats, playerSkills, gameSettings, playerInventory } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

async function initExistingUsers() {
  console.log('👥 开始为现有用户初始化数据...\n');

  // 获取所有用户
  const allUsers = await db.select().from(users);
  console.log(`找到 ${allUsers.length} 个用户\n`);

  for (const user of allUsers) {
    console.log(`\n处理用户: ${user.username} (ID: ${user.id})`);

    // 1. 初始化玩家属性
    const existingStats = await db
      .select()
      .from(playerStats)
      .where(eq(playerStats.userId, user.id))
      .limit(1);

    if (existingStats.length === 0) {
      await db.insert(playerStats).values({
        userId: user.id,
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
      });
      console.log('  ✅ 创建玩家属性');
    } else {
      console.log('  ⏭️  玩家属性已存在');
    }

    // 2. 初始化4个基础技能（默认全部解锁用于测试）
    const skillIds = [
      'kanglong_youhui',
      'dugu_jiujian',
      'fuyu_chuanyin',
      'jiguan_suanjin',
    ];

    for (const skillId of skillIds) {
      const existingSkill = await db
        .select()
        .from(playerSkills)
        .where(
          and(
            eq(playerSkills.userId, user.id),
            eq(playerSkills.skillId, skillId)
          )
        )
        .limit(1);

      if (existingSkill.length === 0) {
        await db.insert(playerSkills).values({
          userId: user.id,
          skillId,
          unlocked: true, // 测试阶段全部解锁
          level: 1,
          experience: 0,
          unlockedAt: new Date(),
          timesUsed: 0,
        });
        console.log(`  ✅ 解锁技能: ${skillId}`);
      }
    }

    // 3. 初始化游戏设置
    const existingSettings = await db
      .select()
      .from(gameSettings)
      .where(eq(gameSettings.userId, user.id))
      .limit(1);

    if (existingSettings.length === 0) {
      await db.insert(gameSettings).values({
        userId: user.id,
        language: 'zh',
        musicVolume: 80,
        sfxVolume: 80,
        musicEnabled: true,
        sfxEnabled: true,
        graphicsQuality: 'high',
        showCoordinates: false,
        autoSave: true,
        autoSaveInterval: 5,
      });
      console.log('  ✅ 创建游戏设置');
    } else {
      console.log('  ⏭️  游戏设置已存在');
    }

    // 4. 赠送初始物品（测试用）
    const initialItems = [
      { itemId: 'stamina_pill_small', quantity: 5 },
      { itemId: 'qi_pill_small', quantity: 5 },
      { itemId: 'exp_scroll', quantity: 2 },
    ];

    for (const item of initialItems) {
      const existingItem = await db
        .select()
        .from(playerInventory)
        .where(
          and(
            eq(playerInventory.userId, user.id),
            eq(playerInventory.itemId, item.itemId)
          )
        )
        .limit(1);

      if (existingItem.length === 0) {
        await db.insert(playerInventory).values({
          userId: user.id,
          itemId: item.itemId,
          quantity: item.quantity,
          equipped: false,
        });
        console.log(`  ✅ 赠送物品: ${item.itemId} x${item.quantity}`);
      }
    }
  }

  console.log('\n\n✨ 所有用户数据初始化完成！');
}

// 执行初始化
initExistingUsers()
  .catch((error) => {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
