/**
 * 初始化游戏数据
 * 插入初始物品和任务定义
 */

import { db } from '../src/db';
import { items } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function initGameData() {
  console.log('🎮 开始初始化游戏数据...\n');

  // 初始物品数据
  const initialItems = [
    // 体力药品
    {
      itemId: 'stamina_pill_small',
      name: '小还丹',
      nameEn: 'Small Stamina Pill',
      description: '恢复30点体力的基础丹药',
      itemType: 'potion',
      rarity: 'common',
      effects: { stamina: 30 },
      price: 50,
      sellPrice: 20,
      stackable: true,
      maxStack: 99,
      iconPath: '/game/items/stamina_pill_small.png',
    },
    {
      itemId: 'stamina_pill_medium',
      name: '大还丹',
      nameEn: 'Medium Stamina Pill',
      description: '恢复60点体力的中级丹药',
      itemType: 'potion',
      rarity: 'uncommon',
      effects: { stamina: 60 },
      price: 120,
      sellPrice: 50,
      stackable: true,
      maxStack: 99,
      iconPath: '/game/items/stamina_pill_medium.png',
    },
    {
      itemId: 'stamina_pill_large',
      name: '九转还魂丹',
      nameEn: 'Large Stamina Pill',
      description: '恢复100点体力的高级丹药',
      itemType: 'potion',
      rarity: 'rare',
      effects: { stamina: 100 },
      price: 300,
      sellPrice: 120,
      stackable: true,
      maxStack: 99,
      iconPath: '/game/items/stamina_pill_large.png',
    },

    // 内力药品
    {
      itemId: 'qi_pill_small',
      name: '小回气丹',
      nameEn: 'Small Qi Pill',
      description: '恢复50点内力的基础丹药',
      itemType: 'potion',
      rarity: 'common',
      effects: { qi: 50 },
      price: 80,
      sellPrice: 30,
      stackable: true,
      maxStack: 99,
      iconPath: '/game/items/qi_pill_small.png',
    },
    {
      itemId: 'qi_pill_large',
      name: '大回气丹',
      nameEn: 'Large Qi Pill',
      description: '恢复100点内力的高级丹药',
      itemType: 'potion',
      rarity: 'rare',
      effects: { qi: 100 },
      price: 200,
      sellPrice: 80,
      stackable: true,
      maxStack: 99,
      iconPath: '/game/items/qi_pill_large.png',
    },

    // 经验道具
    {
      itemId: 'exp_scroll',
      name: '武学心得',
      nameEn: 'Martial Arts Scroll',
      description: '获得1000点经验值',
      itemType: 'quest',
      rarity: 'uncommon',
      effects: { experience: 1000 },
      price: 150,
      sellPrice: 60,
      stackable: true,
      maxStack: 99,
      iconPath: '/game/items/exp_scroll.png',
    },

    // 特殊材料
    {
      itemId: 'go_stone_black',
      name: '玄铁棋子（黑）',
      nameEn: 'Black Go Stone',
      description: '珍贵的黑色围棋子，可用于兑换特殊奖励',
      itemType: 'material',
      rarity: 'rare',
      effects: {},
      price: 500,
      sellPrice: 200,
      stackable: true,
      maxStack: 99,
      iconPath: '/game/items/go_stone_black.png',
    },
    {
      itemId: 'go_stone_white',
      name: '白玉棋子（白）',
      nameEn: 'White Go Stone',
      description: '珍贵的白色围棋子，可用于兑换特殊奖励',
      itemType: 'material',
      rarity: 'rare',
      effects: {},
      price: 500,
      sellPrice: 200,
      stackable: true,
      maxStack: 99,
      iconPath: '/game/items/go_stone_white.png',
    },

    // 任务道具
    {
      itemId: 'quest_letter_hongqigong',
      name: '洪七公的信',
      nameEn: 'Letter from Hong Qigong',
      description: '洪七公写给你的信，打开可接受任务',
      itemType: 'quest',
      rarity: 'epic',
      effects: {},
      price: 0,
      sellPrice: 0,
      stackable: false,
      maxStack: 1,
      iconPath: '/game/items/quest_letter.png',
    },
    {
      itemId: 'quest_manual_dugu',
      name: '独孤九剑剑谱',
      nameEn: 'Dugu Nine Swords Manual',
      description: '令狐冲的独孤九剑秘籍，打开可学习',
      itemType: 'quest',
      rarity: 'legendary',
      effects: {},
      price: 0,
      sellPrice: 0,
      stackable: false,
      maxStack: 1,
      iconPath: '/game/items/quest_manual.png',
    },
  ];

  // 插入或更新物品（upsert）
  console.log('📦 插入/更新初始物品...');
  for (const item of initialItems) {
    try {
      // 检查是否已存在
      const existing = await db.select().from(items).where(eq(items.itemId, item.itemId)).limit(1);

      if (existing.length === 0) {
        await db.insert(items).values(item);
        console.log(`  ✅ 新增: ${item.name} (${item.itemId})`);
      } else {
        await db.update(items).set(item).where(eq(items.itemId, item.itemId));
        console.log(`  🔄 更新: ${item.name} (${item.itemId})`);
      }
    } catch (error) {
      console.error(`  ❌ ${item.name} 失败:`, error);
    }
  }

  console.log('\n✨ 游戏数据初始化完成！');
  console.log(`总共处理 ${initialItems.length} 个物品`);
}

// 执行初始化
initGameData()
  .catch((error) => {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
