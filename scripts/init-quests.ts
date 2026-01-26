#!/usr/bin/env tsx
/**
 * 初始化主线任务数据
 * 
 * 创建6个核心主线任务：
 * 1. 初识棋道（教学任务）
 * 2. 拜师洪七公（解锁亢龙有悔）
 * 3. 挑战令狐冲（解锁独孤九剑）
 * 4. 与郭靖对弈（解锁腹语传音）
 * 5. 向黄蓉请教（解锁机关算尽）
 * 6. 第一章完成（解锁后续内容）
 */

import 'dotenv/config';
import { db } from '../src/db';
import { quests } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🎯 初始化主线任务数据...\n');

  const mainQuests = [
    {
      questId: 'quest_001_tutorial',
      title: '初识棋道',
      description: '洪七公愿意指点你围棋的基础知识。完成一场对局，了解围棋的魅力。',
      questType: 'main',
      chapter: 1,
      requirements: {},
      rewards: {
        experience: 100,
        gold: 50,
      },
      prerequisiteQuests: [],
    },
    {
      questId: 'quest_002_hong_qigong',
      title: '拜师洪七公',
      description: '洪七公见你悟性不错，愿意传授你降龙十八掌的心法。但首先，你需要在对局中展现实力。',
      questType: 'main',
      chapter: 1,
      requirements: {
        level: 2,
      },
      rewards: {
        experience: 300,
        skills: ['kanglong_yougui'],
        gold: 100,
      },
      prerequisiteQuests: ['quest_001_tutorial'],
    },
    {
      questId: 'quest_003_linghu_chong',
      title: '挑战令狐冲',
      description: '听闻少林寺有一位剑客令狐冲，棋艺高超。前往少林寺，与他切磋棋艺。',
      questType: 'main',
      chapter: 1,
      requirements: {
        level: 5,
      },
      rewards: {
        experience: 500,
        skills: ['dugu_jiujian'],
        gold: 200,
      },
      prerequisiteQuests: ['quest_002_hong_qigong'],
    },
    {
      questId: 'quest_004_guo_jing',
      title: '与郭靖对弈',
      description: '郭靖是襄阳城的守将，同时也是一位围棋高手。前往襄阳城茶馆，与他对弈。',
      questType: 'main',
      chapter: 1,
      requirements: {
        level: 8,
      },
      rewards: {
        experience: 800,
        skills: ['fuyu_chuanyin'],
        gold: 300,
      },
      prerequisiteQuests: ['quest_003_linghu_chong'],
    },
    {
      questId: 'quest_005_huang_rong',
      title: '向黄蓉请教',
      description: '黄蓉机关算尽，对围棋的变化有独到见解。向她学习变化图的技巧。',
      questType: 'main',
      chapter: 1,
      requirements: {
        level: 12,
      },
      rewards: {
        experience: 1200,
        skills: ['jiguan_suanjin'],
        gold: 500,
      },
      prerequisiteQuests: ['quest_004_guo_jing'],
    },
    {
      questId: 'quest_006_chapter_one_complete',
      title: '第一章完结',
      description: '你已经掌握了四大技能，在武林中小有名气。继续修炼，迎接更大的挑战！',
      questType: 'main',
      chapter: 1,
      requirements: {
        level: 15,
      },
      rewards: {
        experience: 2000,
        gold: 1000,
        items: ['master_scroll', 'jade_pendant'],
      },
      prerequisiteQuests: ['quest_005_huang_rong'],
    },
  ];

  try {
    // 删除旧任务（如果存在）
    console.log('🗑️  清理旧任务数据...');
    const questIds = mainQuests.map((q) => q.questId);
    for (const questId of questIds) {
      await db.delete(quests).where(eq(quests.questId, questId));
    }

    // 插入新任务
    console.log('📝 插入主线任务...\n');
    for (const quest of mainQuests) {
      await db.insert(quests).values(quest);
      console.log(`✅ ${quest.title} (${quest.questId})`);
      console.log(`   章节: ${quest.chapter}`);
      console.log(`   类型: ${quest.questType}`);
      console.log(`   奖励: ${quest.rewards.experience} 经验`);
      if (quest.rewards.skills) {
        console.log(`   技能: ${quest.rewards.skills.join(', ')}`);
      }
      if (quest.prerequisiteQuests.length > 0) {
        console.log(`   前置: ${quest.prerequisiteQuests.join(', ')}`);
      }
      console.log('');
    }

    console.log('✨ 任务初始化完成！');
    console.log(`\n📊 总共创建了 ${mainQuests.length} 个主线任务\n`);
  } catch (error) {
    console.error('❌ 任务初始化失败:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
