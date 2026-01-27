import { db } from './index';
import { npcs, quests } from './schema';

// NPC种子数据
const seedNPCs = [
  {
    npcId: 'hongqigong',
    name: '洪七公',
    description: '丐帮帮主，武功高强，性格豪爽。精通降龙十八掌和打狗棒法。',
    mapId: 'huashan',
    positionX: 10,
    positionY: 15,
    dialogues: {
      greeting: '小娃娃，想学武功吗？先陪老叫花下几盘棋再说！',
      victory: '好！有悟性！这招亢龙有悔就传给你了。',
      defeat: '棋艺还需磨练啊，多想想再来。',
    },
    npcType: 'teacher',
    difficulty: 1,
    teachableSkills: ['kanglongyouhui'],
  },
  {
    npcId: 'linghuchong',
    name: '令狐冲',
    description: '华山派大弟子，剑法超群。独孤九剑，破尽天下武功。',
    mapId: 'shaolin',
    positionX: 20,
    positionY: 10,
    dialogues: {
      greeting: '令狐冲见过兄台。听闻你棋艺不错，可否切磋一二？',
      victory: '佩服佩服！独孤九剑的精髓在于看破敌招，这一招就教给你了。',
      defeat: '再接再厉，多加练习。',
    },
    npcType: 'teacher',
    difficulty: 2,
    teachableSkills: ['dugujiujian'],
  },
  {
    npcId: 'guojing',
    name: '郭靖',
    description: '襄阳城守将，侠之大者。武功深厚，为人正直。',
    mapId: 'xiangyang',
    positionX: 30,
    positionY: 20,
    dialogues: {
      greeting: '这位朋友，襄阳城危在旦夕，若能助我守城，郭某不胜感激。',
      victory: '多谢相助！这是我从前学的一招，希望对你有用。',
      defeat: '技不如人，还需努力。',
    },
    npcType: 'opponent',
    difficulty: 3,
    teachableSkills: [],
  },
  {
    npcId: 'xuzhu',
    name: '虚竹',
    description: '少林寺僧人，机缘巧合下习得逍遥派武功。',
    mapId: 'shaolin',
    positionX: 15,
    positionY: 25,
    dialogues: {
      greeting: '阿弥陀佛，施主请了。',
      victory: '施主慧根深厚，这腹语传音之术可助你明辨棋局。',
      defeat: '佛曰：胜败乃兵家常事。',
    },
    npcType: 'teacher',
    difficulty: 2,
    teachableSkills: ['fuyuchuanyin'],
  },
  {
    npcId: 'huangrong',
    name: '黄蓉',
    description: '桃花岛主之女，聪慧过人，精通奇门遁甲。',
    mapId: 'xiangyang',
    positionX: 25,
    positionY: 18,
    dialogues: {
      greeting: '这位公子，蓉儿久仰大名。',
      victory: '公子果然厉害！这机关算尽之法，可助你预测棋局变化。',
      defeat: '还需多加思考呢。',
    },
    npcType: 'teacher',
    difficulty: 3,
    teachableSkills: ['jiguansuanjin'],
  },
];

// 任务种子数据
const seedQuests = [
  {
    questId: 'tutorial_001',
    title: '初识棋道',
    description: '在华山传功厅找到洪七公，了解围棋的基本规则。',
    questType: 'tutorial',
    chapter: 1,
    requirements: {
      type: 'talk',
      target: 'hongqigong',
    },
    rewards: {
      experience: 100,
    },
    prerequisiteQuests: [],
  },
  {
    questId: 'main_001',
    title: '拜师洪七公',
    description: '与洪七公对弈，赢得他的认可。使用9路棋盘，难度1。',
    questType: 'main',
    chapter: 1,
    requirements: {
      type: 'battle',
      opponent: 'hongqigong',
      boardSize: 9,
      difficulty: 1,
      mustWin: true,
    },
    rewards: {
      experience: 500,
      skills: ['kanglongyouhui'],
    },
    prerequisiteQuests: ['tutorial_001'],
  },
  {
    questId: 'main_002',
    title: '从少林学艺',
    description: '前往少林寺，向令狐冲学习独孤九剑。',
    questType: 'main',
    chapter: 1,
    requirements: {
      type: 'battle',
      opponent: 'linghuchong',
      boardSize: 9,
      difficulty: 2,
      mustWin: true,
    },
    rewards: {
      experience: 800,
      skills: ['dugujiujian'],
    },
    prerequisiteQuests: ['main_001'],
  },
  {
    questId: 'main_003',
    title: '襄阳城挑战',
    description: '协助郭靖守卫襄阳城，与他切磋棋艺。',
    questType: 'main',
    chapter: 1,
    requirements: {
      type: 'battle',
      opponent: 'guojing',
      boardSize: 9,
      difficulty: 3,
      mustWin: true,
    },
    rewards: {
      experience: 1200,
    },
    prerequisiteQuests: ['main_002'],
  },
  {
    questId: 'side_001',
    title: '少林奇遇',
    description: '在少林寺偶遇虚竹，学习腹语传音。',
    questType: 'side',
    chapter: 1,
    requirements: {
      type: 'battle',
      opponent: 'xuzhu',
      boardSize: 9,
      difficulty: 2,
      mustWin: true,
    },
    rewards: {
      experience: 600,
      skills: ['fuyuchuanyin'],
    },
    prerequisiteQuests: ['main_001'],
  },
  {
    questId: 'side_002',
    title: '蓉儿的考验',
    description: '黄蓉想要考验你的智慧，与她对弈一局。',
    questType: 'side',
    chapter: 1,
    requirements: {
      type: 'battle',
      opponent: 'huangrong',
      boardSize: 9,
      difficulty: 3,
      mustWin: true,
    },
    rewards: {
      experience: 1000,
      skills: ['shenjimiaosuang'],
    },
    prerequisiteQuests: ['main_002'],
  },
];

export async function seed() {
  console.log('🌱 开始播种数据...');

  try {
    // 插入NPC数据
    console.log('📝 插入NPC数据...');
    for (const npc of seedNPCs) {
      await db.insert(npcs).values(npc).onConflictDoNothing();
      console.log(`✅ 插入NPC: ${npc.name}`);
    }

    // 插入任务数据
    console.log('📝 插入任务数据...');
    for (const quest of seedQuests) {
      await db.insert(quests).values(quest).onConflictDoNothing();
      console.log(`✅ 插入任务: ${quest.title}`);
    }

    console.log('✨ 数据播种完成！');
  } catch (error) {
    console.error('❌ 播种数据时出错:', error);
    throw error;
  }
}

// 如果直接运行此文件，则执行种子数据
if (require.main === module) {
  seed()
    .then(() => {
      console.log('🎉 种子数据脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 种子数据脚本执行失败:', error);
      process.exit(1);
    });
}
