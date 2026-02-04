import { db } from './index';
import { npcs } from './schema';

// 注意：Quest定义已移至 src/data/quests.json
// 不再需要从数据库中seed quests

// NPC种子数据
const seedNPCs = [
  {
    npcId: 'hongqigong',
    name: '洪七公',
    description: '丐帮帮主，武功高强，性格豪爽，棋风刚猛。',
    mapId: 'huashan_scene',
    positionX: 10,
    positionY: 15,
    dialogues: {
      greeting: '小娃娃，想学武功吗？先陪老叫花下几盘棋再说！',
      victory: '好！有悟性！这招亢龙有悔就传给你了。',
      defeat: '棋艺还需磨练啊，多想想再来。',
    },
    npcType: 'teacher',
    difficulty: 1,
    teachableSkills: ['kanglong_youhui'],
  },
  {
    npcId: 'linghuchong',
    name: '令狐冲',
    description: '华山派大弟子，剑法超群。独孤九剑，破尽天下武功。',
    mapId: 'shaolin_scene',
    positionX: 20,
    positionY: 10,
    dialogues: {
      greeting: '令狐冲见过兄台。听闻你棋艺不错，可否切磋一二？',
      victory: '佩服佩服！独孤九剑的精髓在于看破敌招，这一招就教给你了。',
      defeat: '再接再厉，多加练习。',
    },
    npcType: 'teacher',
    difficulty: 2,
    teachableSkills: ['dugu_jiujian'],
  },
  {
    npcId: 'guojing',
    name: '郭靖',
    description: '襄阳城守将，侠之大者。武功深厚，为人正直。',
    mapId: 'xiangyang_scene',
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
    mapId: 'shaolin_scene',
    positionX: 15,
    positionY: 25,
    dialogues: {
      greeting: '阿弥陀佛，施主请了。',
      victory: '施主慧根深厚，这腹语传音之术可助你明辨棋局。',
      defeat: '佛曰：胜败乃兵家常事。',
    },
    npcType: 'teacher',
    difficulty: 2,
    teachableSkills: ['fuyu_chuanyin'],
  },
  {
    npcId: 'huangrong',
    name: '黄蓉',
    description: '桃花岛主之女，聪慧过人，精通奇门遁甲。',
    mapId: 'xiangyang_scene',
    positionX: 25,
    positionY: 18,
    dialogues: {
      greeting: '这位公子，蓉儿久仰大名。',
      victory: '公子果然厉害！这机关算尽之法，可助你预测棋局变化。',
      defeat: '还需多加思考呢。',
    },
    npcType: 'teacher',
    difficulty: 3,
    teachableSkills: ['jiguan_suanjin'],
  },
];

// 注意：任务种子数据已移至 src/data/quests.json
// 不再需要从数据库中seed quests，改用JSON文件管理

export async function seed() {
  console.log('🌱 开始播种数据...');

  try {
    // 插入NPC数据
    console.log('📝 插入NPC数据...');
    for (const npc of seedNPCs) {
      await db.insert(npcs).values(npc).onConflictDoNothing();
      console.log(`✅ 插入NPC: ${npc.name}`);
    }

    console.log('✨ 数据播种完成！');
    console.log('ℹ️  任务数据现在从 src/data/quests.json 加载，不再需要seed到数据库');
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
