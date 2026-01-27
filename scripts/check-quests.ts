/**
 * 检查任务表数据
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function checkQuests() {
  const { db } = await import('../src/db/index');
  const { quests } = await import('../src/db/schema');

  console.log('📋 Checking quests table...\n');

  try {
    const allQuests = await db.select().from(quests);
    
    console.log(`Total quests: ${allQuests.length}\n`);

    if (allQuests.length > 0) {
      console.log('📊 Quest Details:');
      console.log('='.repeat(80));
      
      allQuests.forEach((quest, index) => {
        console.log(`\n${index + 1}. ${quest.title}`);
        console.log(`   ID: ${quest.id}`);
        console.log(`   Type: ${quest.type}`);
        console.log(`   Level Required: ${quest.levelRequired}`);
        console.log(`   Description: ${quest.description}`);
        console.log(`   Objectives: ${JSON.stringify(quest.objectives, null, 2)}`);
        console.log(`   Rewards: ${JSON.stringify(quest.rewards, null, 2)}`);
        if (quest.prerequisiteQuestIds) {
          console.log(`   Prerequisites: ${JSON.stringify(quest.prerequisiteQuestIds)}`);
        }
      });
    } else {
      console.log('⚠️  No quests found in database');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking quests:', error);
    process.exit(1);
  }
}

checkQuests();
