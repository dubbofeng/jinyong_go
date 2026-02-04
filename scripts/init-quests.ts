#!/usr/bin/env tsx
/**
 * 初始化任务系统 - MVP版本
 * 
 * 6个主线任务：
 * 1. 初入江湖 - 教程任务，完成第一场对局
 * 2. 拜师学艺 - 战胜洪七公，解锁第一个技能
 * 3. 小试身手 - 完成5个死活题
 * 4. 名震江湖 - 连胜3场对局
 * 5. 武林大会 - 战胜令狐冲，解锁高级技能
 * 6. 一代宗师 - 达到等级10，完成10个死活题
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const { db } = await import('../src/db');
  const { quests } = await import('../src/db/schema');
  
  console.log('🎯 Initializing Quest System...\n');

  const questData = [
    // 任务1：初入江湖
    {
      questId: 'main_quest_01',
      title: '初入江湖',
      description: '欢迎来到武林世界！在这里，围棋不仅是一门艺术，更是修炼武功的途径。先找到洪七公，与他对弈一局，体验棋道的魅力。',
      questType: 'main',
      chapter: 1,
      requirements: {
        type: 'complete_games',
        count: 1,
        description: '完成1场围棋对局'
      },
      rewards: {
        experience: 100,
      },
      prerequisiteQuests: [],
    },
    
    // 任务2：拜师学艺
    {
      questId: 'main_quest_02',
      title: '拜师学艺',
      description: '洪七公是丐帮帮主，棋风刚猛。他愿意指点你棋艺，但你需要在9路棋盘上击败他，证明你的潜力。',
      questType: 'main',
      chapter: 1,
      requirements: {
        type: 'defeat_npc',
        npcId: 'hongqigong',
        boardSize: 9,
        description: '在9路棋盘上战胜洪七公'
      },
      rewards: {
        experience: 300,
        skills: ['kanglong_youhui'],
      },
      prerequisiteQuests: ['main_quest_01'],
    },
    
    // 任务3：小试身手
    {
      questId: 'main_quest_03',
      title: '小试身手',
      description: '死活题是围棋修炼的基本功，也是武林高手提升内力的方法。前往棋馆，完成5道死活题，锤炼你的计算能力。',
      questType: 'main',
      chapter: 1,
      requirements: {
        type: 'solve_tsumego',
        count: 5,
        maxDifficulty: 3,
        description: '完成5道死活题（难度≤3）'
      },
      rewards: {
        experience: 200,
      },
      prerequisiteQuests: ['main_quest_02'],
    },
    
    // 任务4：名震江湖
    {
      questId: 'main_quest_04',
      title: '名震江湖',
      description: '你已经掌握了基本功，是时候在江湖中闯出名堂了。连续获胜3场对局，让武林中人知道你的名字！',
      questType: 'main',
      chapter: 1,
      requirements: {
        type: 'win_streak',
        count: 3,
        description: '连胜3场对局'
      },
      rewards: {
        experience: 500,
        items: ['jade_pendant'],
      },
      prerequisiteQuests: ['main_quest_03'],
    },
    
    // 任务5：武林大会
    {
      questId: 'main_quest_05',
      title: '武林大会',
      description: '少林寺举办武林大会，剑客令狐冲以独孤九剑闻名天下。在13路棋盘上挑战他，证明你已经成为真正的高手！',
      questType: 'main',
      chapter: 1,
      requirements: {
        type: 'defeat_npc',
        npcId: 'linghuchong',
        boardSize: 13,
        minLevel: 5,
        description: '达到等级5，在13路棋盘上战胜令狐冲'
      },
      rewards: {
        experience: 800,
        skills: ['dugu_jiujian'],
      },
      prerequisiteQuests: ['main_quest_04'],
    },
    
    // 任务6：一代宗师
    {
      questId: 'main_quest_06',
      title: '一代宗师',
      description: '通过刻苦修炼，你已经在武林中占有一席之地。达到等级10，并完成10道高难度死活题，成为受人尊敬的一代宗师！',
      questType: 'main',
      chapter: 1,
      requirements: {
        type: 'milestone',
        level: 10,
        tsumegoCount: 10,
        tsumegoMinDifficulty: 4,
        description: '达到等级10，完成10道死活题（难度≥4）'
      },
      rewards: {
        experience: 1500,
        items: ['master_scroll', 'golden_badge'],
      },
      prerequisiteQuests: ['main_quest_05'],
    },
  ];

  console.log('📝 Creating quests...\n');

  for (const quest of questData) {
    try {
      await db.insert(quests).values(quest);
      console.log(`✓ Created: ${quest.title} (${quest.questId})`);
    } catch (error) {
      console.error(`✗ Failed to create ${quest.questId}:`, error);
    }
  }

  console.log('\n✅ Quest initialization complete!');
  console.log(`📊 Total quests created: ${questData.length}`);
  
  // 显示任务链
  console.log('\n🔗 Quest Chain:');
  questData.forEach((quest, index) => {
    const prereq = quest.prerequisiteQuests.length > 0 
      ? ` (requires: ${quest.prerequisiteQuests.join(', ')})` 
      : ' (starting quest)';
    console.log(`   ${index + 1}. ${quest.title}${prereq}`);
  });

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
