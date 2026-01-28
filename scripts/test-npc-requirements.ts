import { db } from '../app/db';
import { npcs } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { Requirements } from '../src/types/requirements';

/**
 * 测试脚本：为现有NPC添加requirements配置
 */
async function setupNpcRequirements() {
  console.log('开始配置NPC requirements...\n');

  // 1. 郭靖 - 序章NPC，需要击败洪七公和令狐冲，10级以上
  const guojingRequirements = {
    dialogues: {
      first_meet: {
        unlockConditions: [
          Requirements.and(
            Requirements.firstTime(),
            Requirements.level(10),
            Requirements.npcDefeated('hongqigong'),
            Requirements.npcDefeated('linghuchong')
          ),
        ],
        lockedHint: '需要击败洪七公和令狐冲，且达到10级',
      },
      learn_taiji: {
        unlockConditions: [
          Requirements.level(15),
        ],
        lockedHint: '需要15级才能学习太极拳',
      },
    },
    battle: {
      unlockConditions: [
        Requirements.and(
          Requirements.level(10),
          Requirements.npcDefeated('hongqigong'),
          Requirements.npcDefeated('linghuchong')
        ),
      ],
      repeatable: true,
      repeatConditions: [Requirements.defeatedCount(1)],
      cooldownSeconds: 1800, // 30分钟
      lockedHint: '需要10级并击败洪七公和令狐冲才能挑战郭靖',
    },
  };

  await db
    .update(npcs)
    .set({ requirements: guojingRequirements })
    .where(eq(npcs.npcId, 'guojing'));
  console.log('✅ 郭靖 - requirements已配置');

  // 2. 黄蓉 - 第一章，教授机关算尽
  const huangrongRequirements = {
    dialogues: {
      first_meet: {
        unlockConditions: [
          Requirements.and(
            Requirements.chapter(1),
            Requirements.firstTime()
          ),
        ],
      },
      learn_skill: {
        unlockConditions: [
          Requirements.and(
            Requirements.chapter(1),
            Requirements.level(8),
            Requirements.not(Requirements.skillUnlocked('ji_guan_suan_jin'))
          ),
        ],
        lockedHint: '需要达到第一章并且8级',
      },
      casual_chat: {
        unlockConditions: [Requirements.chapter(1)],
      },
    },
  };

  await db
    .update(npcs)
    .set({ requirements: huangrongRequirements })
    .where(eq(npcs.npcId, 'huangrong'));
  console.log('✅ 黄蓉 - requirements已配置');

  // 3. 段延庆 - 第二章，教授腹语传音
  const duanyanqingRequirements = {
    dialogues: {
      first_meet: {
        unlockConditions: [
          Requirements.and(
            Requirements.chapter(2),
            Requirements.firstTime()
          ),
        ],
      },
      learn_fuyu: {
        unlockConditions: [
          Requirements.and(
            Requirements.chapter(2),
            Requirements.level(15),
            Requirements.not(Requirements.skillUnlocked('fuyu_chuanyin'))
          ),
        ],
        lockedHint: '需要达到第二章并且15级',
      },
    },
    battle: {
      unlockConditions: [
        Requirements.and(
          Requirements.chapter(2),
          Requirements.level(18)
        ),
      ],
      repeatable: false,
      lockedHint: '需要达到第二章并且18级才能挑战段延庆',
    },
  };

  await db
    .update(npcs)
    .set({ requirements: duanyanqingRequirements })
    .where(eq(npcs.npcId, 'duanyanqing'));
  console.log('✅ 段延庆 - requirements已配置');

  // 4. 段誉 - 第三章，教授六脉神剑
  const duanyuRequirements = {
    dialogues: {
      first_meet: {
        unlockConditions: [
          Requirements.and(
            Requirements.chapter(2),
            Requirements.firstTime()
          ),
        ],
      },
      learn_liumai: {
        unlockConditions: [
          Requirements.and(
            Requirements.chapter(3),
            Requirements.level(25),
            Requirements.not(Requirements.skillUnlocked('liumai_shen_jian'))
          ),
        ],
        lockedHint: '需要达到第三章并且25级',
      },
    },
  };

  await db
    .update(npcs)
    .set({ requirements: duanyuRequirements })
    .where(eq(npcs.npcId, 'duanyu'));
  console.log('✅ 段誉 - requirements已配置');

  // 5. 洪七公 - 序章NPC，无限制（新手引导）
  const hongqigongRequirements = {
    dialogues: {
      first_meet: {
        unlockConditions: [Requirements.firstTime()],
      },
      learn_jianglong: {
        unlockConditions: [
          Requirements.level(8),
        ],
        lockedHint: '需要8级才能学习降龙十八掌',
      },
    },
    battle: {
      unlockConditions: [Requirements.level(6)],
      repeatable: true,
      repeatConditions: [Requirements.defeatedCount(1)],
      cooldownSeconds: 1800, // 30分钟
      lockedHint: '需要6级才能挑战洪七公',
    },
  };

  await db
    .update(npcs)
    .set({ requirements: hongqigongRequirements })
    .where(eq(npcs.npcId, 'hongqigong'));
  console.log('✅ 洪七公 - requirements已配置');

  // 6. 令狐冲 - 序章NPC，需要先见过洪七公
  const linghuchongRequirements = {
    dialogues: {
      first_meet: {
        unlockConditions: [
          Requirements.and(
            Requirements.firstTime(),
            // 使用affection_level来检查是否见过洪七公（只要有关系记录即可）
            { type: 'affection_level' as const, npcId: 'hongqigong', minAffection: 0, description: '见过洪七公' }
          ),
        ],
        lockedHint: '需要先见过洪七公',
      },
      learn_dugu: {
        unlockConditions: [
          Requirements.level(5),
        ],
        lockedHint: '需要5级才能学习独孤九剑',
      },
    },
    battle: {
      unlockConditions: [
        Requirements.and(
          Requirements.level(3),
          { type: 'affection_level' as const, npcId: 'hongqigong', minAffection: 0, description: '见过洪七公' }
        ),
      ],
      repeatable: true,
      repeatConditions: [Requirements.defeatedCount(1)],
      cooldownSeconds: 1200, // 20分钟
      lockedHint: '需要3级并见过洪七公才能挑战令狐冲',
    },
  };

  await db
    .update(npcs)
    .set({ requirements: linghuchongRequirements })
    .where(eq(npcs.npcId, 'linghuchong'));
  console.log('✅ 令狐冲 - requirements已配置');

  console.log('\n✨ 所有NPC requirements配置完成！');
}

// 验证配置
async function verifyRequirements() {
  console.log('\n开始验证配置...\n');

  const npcList = await db
    .select()
    .from(npcs)
    .where(eq(npcs.requirements, null));

  if (npcList.length === 0) {
    console.log('✅ 所有NPC都已配置requirements');
  } else {
    console.log(`⚠️  还有 ${npcList.length} 个NPC未配置requirements:`);
    npcList.forEach((npc) => {
      console.log(`  - ${npc.name} (${npc.npcId})`);
    });
  }

  // 显示已配置的NPC
  const configuredNpcs = await db
    .select({
      npcId: npcs.npcId,
      name: npcs.name,
      requirements: npcs.requirements,
    })
    .from(npcs);

  console.log('\n已配置requirements的NPC:');
  configuredNpcs.forEach((npc) => {
    if (npc.requirements) {
      console.log(`✓ ${npc.name} (${npc.npcId})`);
      console.log(`  对话选项: ${Object.keys((npc.requirements as any).dialogues || {}).length}`);
      console.log(`  战斗配置: ${(npc.requirements as any).battle ? '已配置' : '未配置'}`);
    }
  });
}

// 运行脚本
async function main() {
  try {
    await setupNpcRequirements();
    await verifyRequirements();
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

main();
