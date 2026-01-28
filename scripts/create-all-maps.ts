import 'dotenv/config';
import { db } from '../app/db';
import { maps } from '../src/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 根据游戏策划.md创建所有提到的地图
 * 
 * 序章：道观静室
 * 第一章：华山、少林寺、襄阳城（已有）
 * 第二章：天龙寺、无量山、万劫谷
 * 第三章：桃花岛（已有）、梅庄、海宁
 * 第四章：昆仑山、光明顶
 * 第五章：终南山、古墓、华山（已有）、擂鼓山
 */

async function createAllMaps() {
  console.log('🗺️  开始创建游戏策划文档中的所有地图...\n');

  const mapsToCreate = [
    // 序章
    {
      mapId: 'daoguan_scene',
      name: '道观静室',
      description: '木桑道长修炼之所，穿越者初到之地',
      chapter: 0,
      minLevel: 1,
      worldX: 16,
      worldY: 16,
      imagePromptZh: '中国古代道观内部静室，古朴雅致，墙上挂着围棋棋盘，木桌上摆放着黑白棋子，窗外青山绿水，阳光透过窗棂洒进室内，营造出宁静祥和的氛围。等距视角，中国水墨画风格。',
      imagePromptEn: 'Ancient Chinese Taoist temple meditation room, simple and elegant, with a Go board hanging on the wall, black and white stones on a wooden table, green mountains and clear waters outside the window, sunlight streaming through the lattice windows, creating a peaceful and serene atmosphere. Isometric view, Chinese ink painting style.'
    },
    
    // 第二章 - 大理佛缘（16-25级）
    {
      mapId: 'tianlong_scene',
      name: '天龙寺',
      description: '大理皇家寺院，段氏高僧修行之地',
      chapter: 2,
      minLevel: 16,
      worldX: 12,
      worldY: 24,
      imagePromptZh: '大理天龙寺，金碧辉煌的佛教寺院，大雄宝殿前的广场上有僧人在下围棋，远处是苍山洱海的美景，建筑采用白族风格，庄严肃穆又不失优雅。等距视角，中国古典建筑风格。',
      imagePromptEn: 'Tianlong Temple in Dali, magnificent Buddhist temple, monks playing Go in the square in front of the main hall, Cangshan Mountain and Erhai Lake in the distance, Bai ethnic architecture style, solemn yet elegant. Isometric view, Chinese classical architecture style.'
    },
    {
      mapId: 'wuliang_scene',
      name: '无量山',
      description: '云南无量山，风景秀丽，高人隐居',
      chapter: 2,
      minLevel: 18,
      worldX: 10,
      worldY: 26,
      imagePromptZh: '云南无量山，山峦叠嶂，云雾缭绕，山腰处有一处隐秘的石台，上面刻着围棋棋盘，周围古树参天，飞瀑流泉，仙气飘飘。等距视角，中国山水画风格。',
      imagePromptEn: 'Wuliang Mountain in Yunnan, rolling mountains shrouded in mist, a hidden stone platform halfway up the mountain with a Go board carved on it, surrounded by ancient trees and waterfalls, ethereal atmosphere. Isometric view, Chinese landscape painting style.'
    },
    {
      mapId: 'wanjie_scene',
      name: '万劫谷',
      description: '黄眉僧与段延庆惊世对局之地',
      chapter: 2,
      minLevel: 20,
      worldX: 11,
      worldY: 25,
      imagePromptZh: '万劫谷，幽深的山谷，谷底有一块巨大的青石，石上刻着围棋棋盘（用内力刻成），周围悬崖峭壁，气氛紧张而神秘，透露出生死对决的严肃感。等距视角，戏剧化的光影效果。',
      imagePromptEn: 'Valley of Ten Thousand Tribulations, deep valley with a huge bluestone at the bottom, a Go board carved with inner power on the stone, surrounded by steep cliffs, tense and mysterious atmosphere, conveying the seriousness of life-and-death confrontation. Isometric view, dramatic lighting effects.'
    },
    
    // 第三章 - 江南棋会（26-35级）
    {
      mapId: 'meizhuang_scene',
      name: '梅庄',
      description: '江南梅庄，黑白子珍藏《呕血谱》之处',
      chapter: 3,
      minLevel: 26,
      worldX: 26,
      worldY: 20,
      imagePromptZh: '江南梅庄，典雅的江南园林建筑，庭院中梅花盛开，书房内陈列着古老的围棋棋谱，墙上挂着名家手迹，充满书香气息。等距视角，江南园林风格。',
      imagePromptEn: 'Meizhuang in Jiangnan, elegant classical garden architecture, plum blossoms blooming in the courtyard, ancient Go manuals displayed in the study, famous calligraphy hanging on the walls, full of scholarly atmosphere. Isometric view, Jiangnan garden style.'
    },
    {
      mapId: 'haining_scene',
      name: '海宁',
      description: '海宁陈阁老府，红花会总舵主陈家洛棋艺高超',
      chapter: 3,
      minLevel: 30,
      worldX: 27,
      worldY: 18,
      imagePromptZh: '海宁陈阁老府，气派的官宦宅邸，大厅正中摆放着精美的围棋桌，棋盘旁散落着黑白棋子（暗示棋子可当暗器），远处是钱塘江潮水，气势磅礴。等距视角，明清建筑风格。',
      imagePromptEn: 'Chen Manor in Haining, grand official residence, exquisite Go table in the center of the hall, black and white stones scattered beside the board (hinting they can be used as hidden weapons), Qiantang River tides in the distance, magnificent momentum. Isometric view, Ming-Qing architecture style.'
    },
    
    // 第四章 - 西域争锋（36-45级）
    {
      mapId: 'kunlun_scene',
      name: '昆仑山',
      description: '昆仑山空地，何足道"琴棋剑三圣"自我对弈之处',
      chapter: 4,
      minLevel: 36,
      worldX: 4,
      worldY: 10,
      imagePromptZh: '昆仑山巅，雪山之上的开阔空地，地面用剑尖刻着围棋棋盘，周围白雪皑皑，远处群山连绵，天地间一片苍茫，透露出孤独修行的意境。等距视角，高山雪景风格。',
      imagePromptEn: 'Summit of Kunlun Mountain, open space on the snowy peak, Go board carved with sword tip on the ground, surrounded by snow, continuous mountains in the distance, vast world conveying the artistic conception of solitary cultivation. Isometric view, alpine snow scenery style.'
    },
    {
      mapId: 'guangming_scene',
      name: '光明顶',
      description: '明教总坛，张无忌修炼乾坤大挪移之地',
      chapter: 4,
      minLevel: 40,
      worldX: 6,
      worldY: 12,
      imagePromptZh: '光明顶明教总坛，巍峨的石殿，大厅中央悬挂着巨大的日月图腾，地面铺着太极图案的围棋棋盘，光影交错，神秘而庄严。等距视角，波斯风格与中国元素融合。',
      imagePromptEn: 'Guangmingding, Ming Cult headquarters, majestic stone hall, huge sun and moon totem hanging in the center, Go board with Taiji pattern on the floor, interplay of light and shadow, mysterious and solemn. Isometric view, fusion of Persian and Chinese elements.'
    },
    
    // 第五章 - 华山论棋（46-50级）
    {
      mapId: 'zhongnan_scene',
      name: '终南山',
      description: '全真派道观，周伯通研究左右互搏之地',
      chapter: 5,
      minLevel: 46,
      worldX: 18,
      worldY: 13,
      imagePromptZh: '终南山全真道观，古朴的道教建筑群，练功场上有两张并列的围棋棋盘（暗示左右互搏），松树环绕，仙鹤飞舞，充满道家仙风。等距视角，道教建筑风格。',
      imagePromptEn: 'Zhongnan Mountain Quanzhen Taoist Temple, simple Taoist architecture complex, two parallel Go boards in the training ground (hinting at ambidextrous technique), surrounded by pine trees, cranes flying, full of Taoist immortal atmosphere. Isometric view, Taoist architecture style.'
    },
    {
      mapId: 'gumu_scene',
      name: '古墓',
      description: '活死人墓，小龙女守护机关之处',
      chapter: 5,
      minLevel: 47,
      worldX: 19,
      worldY: 14,
      imagePromptZh: '活死人墓，幽暗的地下墓室，石壁上刻满机关图案，地面有发光的围棋棋盘（玉石制成），周围有暗器机关，神秘而危险。等距视角，地下墓穴风格。',
      imagePromptEn: 'Ancient Tomb, dark underground tomb chamber, stone walls carved with mechanism patterns, glowing Go board (made of jade) on the floor, surrounded by hidden weapon mechanisms, mysterious and dangerous. Isometric view, underground tomb style.'
    },
    {
      mapId: 'leigu_scene',
      name: '擂鼓山',
      description: '无崖子珍珑棋局所在，天下棋手终极挑战',
      chapter: 5,
      minLevel: 48,
      worldX: 20,
      worldY: 15,
      imagePromptZh: '擂鼓山山洞，洞内有巨大的石床，床上放着传说中的珍珑棋局，棋盘发出淡淡的光芒，周围散落着失败者留下的血迹，气氛凝重而神圣。等距视角，山洞内部风格。',
      imagePromptEn: 'Leigu Mountain cave, huge stone bed inside with the legendary Zhenlong Go puzzle, the board emitting a faint glow, bloodstains left by failed challengers scattered around, solemn and sacred atmosphere. Isometric view, cave interior style.'
    }
  ];

  const existingMaps = await db.select().from(maps);
  console.log(`📋 数据库中已有 ${existingMaps.length} 个地图：`);
  existingMaps.forEach(m => console.log(`  - ${m.name} (${m.mapId})`));
  
  console.log('\n🆕 准备创建的新地图：');
  
  let createdCount = 0;
  let skippedCount = 0;

  for (const mapData of mapsToCreate) {
    // 检查地图是否已存在
    const existing = existingMaps.find(m => m.mapId === mapData.mapId);
    
    if (existing) {
      console.log(`  ⏭️  跳过：${mapData.name} (${mapData.mapId}) - 已存在`);
      skippedCount++;
      continue;
    }

    // 创建新地图（32x32，空地图）
    const newMap = await db.insert(maps).values({
      mapId: mapData.mapId,
      name: mapData.name,
      mapType: 'scene',
      width: 32,
      height: 32,
      description: mapData.description,
      chapter: mapData.chapter,
      minLevel: mapData.minLevel,
      worldX: mapData.worldX,
      worldY: mapData.worldY,
      imagePromptZh: mapData.imagePromptZh,
      imagePromptEn: mapData.imagePromptEn,
      metadata: {
        description: mapData.description,
        chapter: mapData.chapter,
        minLevel: mapData.minLevel
      }
    }).returning();

    console.log(`  ✅ 创建：${mapData.name} (${mapData.mapId}) - ID: ${newMap[0].id}, 世界坐标: (${mapData.worldX}, ${mapData.worldY})`);
    createdCount++;
  }

  console.log(`\n📊 统计信息：`);
  console.log(`  - 已创建：${createdCount} 个地图`);
  console.log(`  - 已跳过：${skippedCount} 个地图`);
  console.log(`  - 总计：${existingMaps.length + createdCount} 个地图`);

  console.log('\n✨ 地图创建完成！');
  console.log('\n💡 提示：');
  console.log('  - 所有地图已包含章节、等级要求、世界地图坐标信息');
  console.log('  - 中英文AI生成图片提示词已保存到数据库');
  console.log('  - 这些地图目前是空的（32x32），需要后续使用地图编辑器添加具体内容');
  console.log('  - 可以使用生成脚本根据提示词生成等距图');
  
  process.exit(0);
}

createAllMaps().catch(error => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
