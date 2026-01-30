#!/usr/bin/env tsx
/**
 * 初始化所有NPC数据
 * 根据 docs/Post-MVP计划.md 生成所有NPC和对应的items记录
 */

import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { npcs, items } from '../src/db/schema';
import { eq } from 'drizzle-orm';

// 加载环境变量
dotenv.config({ path: '.env.local' });

// 连接数据库
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
if (!connectionString) {
  throw new Error('POSTGRES_URL or DATABASE_URL environment variable is required');
}

const client = postgres(connectionString);
const db = drizzle(client);

// NPC数据定义（基于Post-MVP计划）
const npcData = [
  // ===== 序章：初识棋道 =====
  {
    npcId: 'musang_daoren',
    name: '木桑道长',
    nameEn: 'Taoist Musang',
    description: '道观住持，爱吹嘘但心地善良的老道士。精通围棋，愿意教授棋道入门。',
    descriptionEn: 'Taoist abbot, a boastful but kind-hearted old Taoist. Expert in Go, willing to teach the basics.',
    mapId: 'daoguan_scene',
    positionX: 16,
    positionY: 16,
    npcType: 'teacher',
    difficulty: 1,
    teachableSkills: [],
    chapter: 0,
    spritePath: '/game/isometric/characters/npc_musang_daoren.png',
    avatarPath: '/game/avatars/musang_daoren.png',
    aiPrompt: 'Isometric sprite of elderly Chinese Taoist master with white hair and beard, wearing traditional Taoist robes, kind smile, holding a dust whisk, 2.5D game character, pixel art style',
  },
  
  // ===== 第一章：中原风云（1-15级）=====
  {
    npcId: 'hong_qigong',
    name: '洪七公',
    nameEn: 'Hong Qigong',
    description: '丐帮帮主，武林泰斗。性格豪爽，武功高强，棋风刚猛。',
    descriptionEn: 'Leader of the Beggar Sect, a martial arts grandmaster. Straightforward personality, exceptional kung fu.',
    mapId: 'huashan_scene',
    positionX: 15,
    positionY: 18,
    npcType: 'teacher',
    difficulty: 2,
    teachableSkills: ['kanglong_youhui'],
    chapter: 1,
    spritePath: '/game/isometric/characters/npc_hong_qigong.png',
    avatarPath: '/game/avatars/hong_qigong.png',
    aiPrompt: 'Isometric sprite of elderly Chinese beggar master, wearing tattered robes but with dignified bearing, holding a bamboo staff, 2.5D game character, pixel art style',
  },
  {
    npcId: 'linghu_chong',
    name: '令狐冲',
    nameEn: 'Linghu Chong',
    description: '华山派大弟子，剑术高超，性格洒脱不羁。独孤九剑的传人。',
    descriptionEn: 'Senior disciple of Huashan Sect, exceptional swordsmanship, free-spirited personality.',
    mapId: 'shaolin_scene',
    positionX: 12,
    positionY: 14,
    npcType: 'teacher',
    difficulty: 3,
    teachableSkills: ['dugu_jiujian'],
    chapter: 1,
    spritePath: '/game/isometric/characters/npc_linghu_chong.png',
    avatarPath: '/game/avatars/linghu_chong.png',
    aiPrompt: 'Isometric sprite of young Chinese swordsman in green robes, carrying a sword, carefree expression, 2.5D game character, pixel art style',
  },
  {
    npcId: 'guo_jing',
    name: '郭靖',
    nameEn: 'Guo Jing',
    description: '大侠郭靖，为国为民的侠之大者。武功深厚，为人正直憨厚。',
    descriptionEn: 'Great hero Guo Jing, a true chivalrous man. Deep martial arts skills, honest and straightforward.',
    mapId: 'xiangyang_scene',
    positionX: 16,
    positionY: 16,
    npcType: 'teacher',
    difficulty: 4,
    teachableSkills: [],
    chapter: 1,
    spritePath: '/game/isometric/characters/npc_guo_jing.png',
    avatarPath: '/game/avatars/guo_jing.png',
    aiPrompt: 'Isometric sprite of Chinese warrior in orange armor, honest face, holding a bow, sturdy build, 2.5D game character, pixel art style',
  },
  {
    npcId: 'huang_rong',
    name: '黄蓉',
    nameEn: 'Huang Rong',
    description: '桃花岛主之女，聪明伶俐，机智过人。精通奇门遁甲和各种机关。',
    descriptionEn: 'Daughter of Peach Blossom Island master, extremely clever and resourceful.',
    mapId: 'xiangyang_scene',
    positionX: 18,
    positionY: 14,
    npcType: 'teacher',
    difficulty: 3,
    teachableSkills: ['jiguan_suanjin'],
    chapter: 1,
    spritePath: '/game/isometric/characters/npc_huang_rong.png',
    avatarPath: '/game/avatars/huang_rong.png',
    aiPrompt: 'Isometric sprite of young Chinese woman in pink dress, intelligent expression, holding a bamboo stick, clever smile, 2.5D game character, pixel art style',
  },
  
  // ===== 第二章：大理佛缘（16-25级）=====
  {
    npcId: 'duan_yu',
    name: '段誉',
    nameEn: 'Duan Yu',
    description: '大理国世子，儒雅温和，精通围棋。曾在万劫谷中参悟北冥神功。',
    descriptionEn: 'Prince of Dali Kingdom, refined and gentle, expert in Go. Learned Beiming Divine Art.',
    mapId: 'tianlong_scene',
    positionX: 16,
    positionY: 16,
    npcType: 'teacher',
    difficulty: 5,
    teachableSkills: ['beiming_shengong'],
    chapter: 2,
    spritePath: '/game/isometric/characters/npc_duan_yu.png',
    avatarPath: '/game/avatars/duan_yu.png',
    aiPrompt: 'Isometric sprite of young Chinese scholar in elegant blue robes, gentle expression, holding a folding fan, 2.5D game character, pixel art style',
  },
  {
    npcId: 'huangmei_seng',
    name: '黄眉僧',
    nameEn: 'Yellow-Browed Monk',
    description: '天龙寺高僧，黄眉长须。曾与段延庆对弈七天七夜，为百姓请命。',
    descriptionEn: 'Senior monk of Tianlong Temple, yellow eyebrows. Played Go with Duan Yanqing for seven days.',
    mapId: 'tianlong_scene',
    positionX: 12,
    positionY: 18,
    npcType: 'teacher',
    difficulty: 6,
    teachableSkills: [],
    chapter: 2,
    spritePath: '/game/isometric/characters/npc_huangmei_seng.png',
    avatarPath: '/game/avatars/huangmei_seng.png',
    aiPrompt: 'Isometric sprite of elderly Buddhist monk with distinctive yellow eyebrows and beard, wearing Buddhist robes, serious expression, 2.5D game character, pixel art style',
  },
  {
    npcId: 'duan_yanqing',
    name: '段延庆',
    nameEn: 'Duan Yanqing',
    description: '天下第一恶人，持铁杖，精通腹语传音。曾与黄眉僧对弈，输后为百姓考虑。',
    descriptionEn: 'The Most Evil Man, carries an iron staff, master of ventriloquism.',
    mapId: 'wanjie_scene',
    positionX: 16,
    positionY: 16,
    npcType: 'opponent',
    difficulty: 6,
    teachableSkills: ['fuyu_chuanyin'],
    chapter: 2,
    spritePath: '/game/isometric/characters/npc_duan_yanqing.png',
    avatarPath: '/game/avatars/duan_yanqing.png',
    aiPrompt: 'Isometric sprite of tragic Chinese man in dark tattered robes, former crown prince of Dali Kingdom, severely disfigured face with scars, crippled legs (sitting or supported by iron crutches), holding iron staff, wearing a face mask or veil, bitter and cold expression, lonely and tragic aura, 2.5D game character, pixel art style',
  },
  {
    npcId: 'yideng_dashi',
    name: '一灯大师',
    nameEn: 'Master Yideng',
    description: '原大理国皇帝，出家为僧。精通佛法和一阳指，以棋悟禅。',
    descriptionEn: 'Former Emperor of Dali, now a Buddhist master. Expert in Zen and martial arts.',
    mapId: 'wuliang_scene',
    positionX: 16,
    positionY: 16,
    npcType: 'teacher',
    difficulty: 7,
    teachableSkills: ['yiyang_zhi'],
    chapter: 2,
    spritePath: '/game/isometric/characters/npc_yideng_dashi.png',
    avatarPath: '/game/avatars/yideng_dashi.png',
    aiPrompt: 'Isometric sprite of elderly Buddhist master in simple robes, kind and wise expression, serene aura, 2.5D game character, pixel art style',
  },
  
  // ===== 第三章：江南棋会（26-35级）=====
  {
    npcId: 'huang_yaoshi',
    name: '黄药师',
    nameEn: 'Huang Yaoshi',
    description: '东邪，桃花岛主。性格狂傲，精通奇门遁甲和音律，以棋局布阵。',
    descriptionEn: 'Eastern Heretic, master of Peach Blossom Island. Arrogant personality, expert in formations.',
    mapId: 'taohua_scene',
    positionX: 16,
    positionY: 16,
    npcType: 'teacher',
    difficulty: 7,
    teachableSkills: [],
    chapter: 3,
    spritePath: '/game/isometric/characters/npc_huang_yaoshi.png',
    avatarPath: '/game/avatars/huang_yaoshi.png',
    aiPrompt: 'Isometric sprite of middle-aged Chinese man in green flowing robes, playing a flute, proud expression, 2.5D game character, pixel art style',
  },
  {
    npcId: 'hei_baizi',
    name: '黑白子',
    nameEn: 'Black-White',
    description: '梅庄棋痴，痴迷于研究《呕血谱》。身穿黑白两色长袍。',
    descriptionEn: 'Go fanatic of Plum Manor, obsessed with studying the Vomiting Blood Manual.',
    mapId: 'meizhuang_scene',
    positionX: 16,
    positionY: 16,
    npcType: 'teacher',
    difficulty: 8,
    teachableSkills: [],
    chapter: 3,
    spritePath: '/game/isometric/characters/npc_hei_baizi.png',
    avatarPath: '/game/avatars/hei_baizi.png',
    aiPrompt: 'Isometric sprite of Chinese man wearing half-black half-white robes, focused expression, surrounded by Go stones, 2.5D game character, pixel art style',
  },
  {
    npcId: 'chen_jialuo',
    name: '陈家洛',
    nameEn: 'Chen Jialuo',
    description: '红花会总舵主，儒雅英武。善用棋子作暗器，能将对手棋子打歪。',
    descriptionEn: 'Chief of Red Flower Society, refined and heroic. Uses Go stones as hidden weapons.',
    mapId: 'haining_scene',
    positionX: 16,
    positionY: 16,
    npcType: 'teacher',
    difficulty: 7,
    teachableSkills: ['qizi_anqi'],
    chapter: 3,
    spritePath: '/game/isometric/characters/npc_chen_jialuo.png',
    avatarPath: '/game/avatars/chen_jialuo.png',
    aiPrompt: 'Isometric sprite of young Chinese scholar-warrior in blue scholarly robes, intelligent eyes, holding Go stones, 2.5D game character, pixel art style',
  },
  
  // ===== 第四章：西域争锋（36-45级）=====
  {
    npcId: 'he_zudao',
    name: '何足道',
    nameEn: 'He Zudao',
    description: '昆仑派高手，剑术超群。常在地上画棋盘自我对弈，后经郭襄点拨开悟。',
    descriptionEn: 'Kunlun Sect expert, exceptional swordsmanship. Often draws Go boards to play against himself.',
    mapId: 'kunlun_scene',
    positionX: 16,
    positionY: 16,
    npcType: 'teacher',
    difficulty: 8,
    teachableSkills: [],
    chapter: 4,
    spritePath: '/game/isometric/characters/npc_he_zudao.png',
    avatarPath: '/game/avatars/he_zudao.png',
    aiPrompt: 'Isometric sprite of Chinese swordsman in white robes, contemplative expression, carrying a sword, 2.5D game character, pixel art style',
  },
  {
    npcId: 'zhang_wuji',
    name: '张无忌',
    nameEn: 'Zhang Wuji',
    description: '明教教主，性格善良温和。精通乾坤大挪移，能将棋盘对称变换。',
    descriptionEn: 'Leader of Ming Cult, kind and gentle. Master of Great Shift technique.',
    mapId: 'guangming_scene',
    positionX: 16,
    positionY: 16,
    npcType: 'teacher',
    difficulty: 8,
    teachableSkills: ['qiankun_danayyi'],
    chapter: 4,
    spritePath: '/game/isometric/characters/npc_zhang_wuji.png',
    avatarPath: '/game/avatars/zhang_wuji.png',
    aiPrompt: 'Isometric sprite of young Chinese man in white robes, gentle expression, kind eyes, 2.5D game character, pixel art style',
  },
  
  // ===== 第五章：华山论棋（46-50级）=====
  {
    npcId: 'zhou_botong',
    name: '周伯通',
    nameEn: 'Zhou Botong',
    description: '老顽童，全真派高手。性格顽皮，精通左右互搏之术。',
    descriptionEn: 'Old Urchin, Quanzhen Sect expert. Playful personality, master of ambidextrous technique.',
    mapId: 'zhongnan_scene',
    positionX: 16,
    positionY: 16,
    npcType: 'teacher',
    difficulty: 8,
    teachableSkills: ['zuoyou_hubo'],
    chapter: 5,
    spritePath: '/game/isometric/characters/npc_zhou_botong.png',
    avatarPath: '/game/avatars/zhou_botong.png',
    aiPrompt: 'Isometric sprite of elderly Chinese Taoist with playful smile, wearing Taoist robes, mischievous expression, 2.5D game character, pixel art style',
  },
  {
    npcId: 'xiao_longnv',
    name: '小龙女',
    nameEn: 'Xiaolongnv',
    description: '古墓派传人，容貌绝美，性格清冷。守护古墓中的棋局机关。',
    descriptionEn: 'Heir of Ancient Tomb Sect, extremely beautiful, cold personality. Guards Go formations.',
    mapId: 'gumu_scene',
    positionX: 16,
    positionY: 16,
    npcType: 'teacher',
    difficulty: 8,
    teachableSkills: [],
    chapter: 5,
    spritePath: '/game/isometric/characters/npc_xiao_longnv.png',
    avatarPath: '/game/avatars/xiao_longnv.png',
    aiPrompt: 'Isometric sprite of young Chinese woman in pure white dress, cold beauty, emotionless expression, 2.5D game character, pixel art style',
  },
  {
    npcId: 'yang_guo',
    name: '杨过',
    nameEn: 'Yang Guo',
    description: '神雕侠，小龙女的挚爱。棋艺亦高超，棋风多变。',
    descriptionEn: 'Divine Eagle Hero, deeply in love with Xiaolongnv. A refined Go player with adaptable style.',
    mapId: 'gumu_scene',
    positionX: 20,
    positionY: 20,
    npcType: 'teacher',
    difficulty: 9,
    teachableSkills: [],
    chapter: 5,
    spritePath: '/game/isometric/characters/npc_yang_guo.png',
    avatarPath: '/game/avatars/yang_guo.png',
    aiPrompt: 'Isometric sprite of young Chinese swordsman in black robes, melancholic expression, missing right arm, 2.5D game character, pixel art style',
  },
  {
    npcId: 'qiao_feng',
    name: '乔峰',
    nameEn: 'Qiao Feng',
    description: '丐帮前帮主，英雄盖世，棋艺与武学相通。',
    descriptionEn: 'Former leader of Beggar Sect, greatest hero with a bold Go style.',
    mapId: 'shaolin_scene',
    positionX: 16,
    positionY: 16,
    npcType: 'teacher',
    difficulty: 9,
    teachableSkills: ['xianglong_shibzhang'],
    chapter: 5,
    spritePath: '/game/isometric/characters/npc_qiao_feng.png',
    avatarPath: '/game/avatars/qiao_feng.png',
    aiPrompt: 'Isometric sprite of tall muscular Chinese warrior in brown warrior robes, heroic bearing, powerful aura, 2.5D game character, pixel art style',
  },
  {
    npcId: 'xu_zhu',
    name: '虚竹',
    nameEn: 'Xu Zhu',
    description: '少林僧人，憨厚纯良。曾无心插柳破解珍珑棋局，顿悟棋道。',
    descriptionEn: 'Shaolin monk, honest and pure. Accidentally solved the Zhenlong Go puzzle.',
    mapId: 'leigu_scene',
    positionX: 20,
    positionY: 20,
    npcType: 'teacher',
    difficulty: 8,
    teachableSkills: [],
    chapter: 5,
    spritePath: '/game/isometric/characters/npc_xu_zhu.png',
    avatarPath: '/game/avatars/xu_zhu.png',
    aiPrompt: 'Isometric sprite of a 20-year-old Buddhist monk in simple robes, adult proportions (not childlike), honest face and calm eyes, 2.5D game character, pixel art style',
  },
  {
    npcId: 'murong_fu',
    name: '慕容复',
    nameEn: 'Murong Fu',
    description: '姑苏慕容世子，武功高强但痴迷复国。曾在珍珑棋局前苦思不得其解。',
    descriptionEn: 'Murong clan heir, obsessed with restoring his kingdom. Failed at Zhenlong puzzle.',
    mapId: 'leigu_scene',
    positionX: 12,
    positionY: 12,
    npcType: 'opponent',
    difficulty: 8,
    teachableSkills: [],
    chapter: 5,
    spritePath: '/game/isometric/characters/npc_murong_fu.png',
    avatarPath: '/game/avatars/murong_fu.png',
    aiPrompt: 'Isometric sprite of noble Chinese young man in luxurious blue robes, proud expression, elegant bearing, 2.5D game character, pixel art style',
  },
];

async function initializeNPCs() {
  console.log('🎭 开始初始化所有NPC...\n');
  
  let created = 0;
  let updated = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;
  
  for (const npc of npcData) {
    try {
      // 1. 创建或更新 NPC 记录
      const existingNpc = await db
        .select()
        .from(npcs)
        .where(eq(npcs.npcId, npc.npcId))
        .limit(1);
      
      if (existingNpc.length > 0) {
        // 更新现有NPC
        await db
          .update(npcs)
          .set({
            name: npc.name,
            description: npc.description,
            mapId: npc.mapId,
            positionX: npc.positionX,
            positionY: npc.positionY,
            npcType: npc.npcType,
            difficulty: npc.difficulty,
            teachableSkills: npc.teachableSkills,
            dialogues: {}, // 对话数据由对话文件管理
            updatedAt: new Date(),
          })
          .where(eq(npcs.npcId, npc.npcId));
        
        console.log(`✏️  更新NPC: ${npc.name} (${npc.npcId})`);
        updated++;
      } else {
        // 创建新NPC
        await db.insert(npcs).values({
          npcId: npc.npcId,
          name: npc.name,
          description: npc.description,
          mapId: npc.mapId,
          positionX: npc.positionX,
          positionY: npc.positionY,
          npcType: npc.npcType,
          difficulty: npc.difficulty,
          teachableSkills: npc.teachableSkills,
          dialogues: {}, // 对话数据由对话文件管理
        });
        
        console.log(`✅ 创建NPC: ${npc.name} (${npc.npcId})`);
        created++;
      }
      
      // 2. 创建或更新对应的 items 记录（用于地图显示）
      const itemId = `npc_${npc.npcId}`;
      const existingItem = await db
        .select()
        .from(items)
        .where(eq(items.itemId, itemId))
        .limit(1);
      
      if (existingItem.length > 0) {
        // 更新现有item
        await db
          .update(items)
          .set({
            name: npc.name,
            nameEn: npc.nameEn,
            description: npc.description,
            descriptionEn: npc.descriptionEn,
            imagePath: npc.spritePath,
            itemType: 'npc',
            category: npc.npcType,
            blocking: true,
            interactable: true,
            prompt: npc.aiPrompt,
            updatedAt: new Date(),
          })
          .where(eq(items.itemId, itemId));
        
        console.log(`   ✏️  更新item: ${itemId}`);
        itemsUpdated++;
      } else {
        // 创建新item
        await db.insert(items).values({
          itemId: itemId,
          name: npc.name,
          nameEn: npc.nameEn,
          description: npc.description,
          descriptionEn: npc.descriptionEn,
          imagePath: npc.spritePath,
          itemType: 'npc',
          category: npc.npcType,
          rarity: 'common',
          blocking: true,
          interactable: true,
          price: 0,
          sellPrice: 0,
          stackable: false,
          size: 1,
          prompt: npc.aiPrompt,
        });
        
        console.log(`   ✅ 创建item: ${itemId}`);
        itemsCreated++;
      }
      
    } catch (error) {
      console.error(`❌ 处理NPC ${npc.name} 时出错:`, error);
    }
  }
  
  console.log('\n📊 统计结果:');
  console.log(`   NPC: ${created} 个新建, ${updated} 个更新`);
  console.log(`   Items: ${itemsCreated} 个新建, ${itemsUpdated} 个更新`);
  console.log(`   总计: ${npcData.length} 个NPC\n`);
  
  console.log('✅ NPC初始化完成！\n');
  console.log('📝 接下来的步骤:');
  console.log('   1. 使用AI图片生成工具生成NPC精灵图和头像');
  console.log('   2. 运行 scripts/generate-complete-maps.ts 更新地图（会自动从数据库读取npcIds）');
  console.log('   3. 创建NPC对话文件到 public/dialogues/[locale]/');
}

// 执行初始化
initializeNPCs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  });
