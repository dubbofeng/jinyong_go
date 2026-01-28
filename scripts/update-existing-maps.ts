import 'dotenv/config';
import { db } from '../app/db';
import { maps } from '../src/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 更新已有地图的详细信息字段
 */

async function updateExistingMaps() {
  console.log('🔄 开始更新已有地图的详细信息...\n');

  const existingMaps = [
    // 世界地图（特殊地图，不需要世界坐标）
    {
      mapId: 'world_map',
      name: '武林世界',
      chapter: null, // 世界地图不属于任何章节
      minLevel: 1,
      worldX: null,
      worldY: null,
      imagePromptZh: '武侠世界大地图，俯瞰视角，展示中原大地的山川河流，标注华山、少林寺、襄阳城、桃花岛、武当山等著名地点，采用中国古代地图的风格，带有古典韵味。等距视角，水墨画风格。',
      imagePromptEn: 'Wuxia world map, bird\'s eye view, showing the mountains and rivers of the Central Plains, marking famous locations such as Huashan, Shaolin Temple, Xiangyang, Peach Blossom Island, Wudang Mountain, in the style of ancient Chinese maps with classical charm. Isometric view, ink painting style.'
    },
    
    // 第一章地图（1-15级）
    {
      mapId: 'huashan_scene',
      name: '华山',
      chapter: 1,
      minLevel: 1,
      worldX: 8,
      worldY: 15,
      imagePromptZh: '等距视角游戏地图素材：华山派山门建筑，完整的独立山门建筑，清晰边界，适合放置在游戏场景中。险峻山峰，开阔演武场，围棋盘。中国山水画风格，游戏美术资源。',
      imagePromptEn: 'Huashan Sect gate, steep mountain peaks shrouded in clouds, winding stone steps, open martial arts training ground in front of the gate with a Go board, magnificent view of the five peaks of Huashan in the distance. Isometric view, Chinese landscape painting style.'
    },
    {
      mapId: 'shaolin_scene',
      name: '少林寺',
      chapter: 1,
      minLevel: 3,
      worldX: 20,
      worldY: 12,
      imagePromptZh: '等距视角游戏地图素材：嵩山少林寺建筑群，完整的独立寺院建筑，清晰边界，适合放置在游戏场景中。大雄宝殿和广场，石桌围棋盘，佛塔。佛教建筑风格，游戏美术资源。',
      imagePromptEn: 'Shaolin Temple on Mount Song, thousand-year-old temple, monks practicing martial arts in the square in front of the main hall, stone table and stools at the edge of the training ground with a Go board, pagodas standing tall, solemn and dignified. Isometric view, Buddhist architecture style.'
    },
    {
      mapId: 'xiangyang_scene',
      name: '襄阳城',
      chapter: 1,
      minLevel: 8,
      worldX: 22,
      worldY: 22,
      imagePromptZh: '等距视角游戏地图素材：襄阳城建筑群，完整的独立古城区域，清晰边界，适合放置在游戏场景中。城墙、城门、茶楼，围棋桌。古代城市风格，游戏美术资源。',
      imagePromptEn: 'Xiangyang City, ancient military stronghold, towering city walls, majestic city gates, bustling streets inside, scholars playing Go in teahouses, magnificent view of the Han River and city walls in the distance. Isometric view, ancient city style.'
    },
    
    // 其他章节地图
    {
      mapId: 'wudang_scene',
      name: '武当山',
      chapter: 1,
      minLevel: 10,
      worldX: 18,
      worldY: 20,
      imagePromptZh: '等距视角游戏地图素材：武当山道观建筑，完整的独立道观建筑，清晰边界，适合放置在游戏场景中。紫霄宫广场，太极围棋桌，青松翠柏。道教建筑风格，游戏美术资源。',
      imagePromptEn: 'Wudang Mountain Taoist temple, square in front of Zixiao Palace, Taoists practicing Tai Chi, a chess table on one side of the square with a board designed with Taiji pattern, surrounded by green pines and cypresses, ethereal atmosphere. Isometric view, Taoist architecture style.'
    },
    {
      mapId: 'taohua_scene',
      name: '桃花岛',
      chapter: 3,
      minLevel: 26,
      worldX: 28,
      worldY: 18,
      imagePromptZh: '等距视角游戏地图素材：桃花岛建筑群，完整的独立岛屿建筑，清晰边界，适合放置在游戏场景中。桃花盛开，机关建筑，药师精舍。海岛仙境风格，游戏美术资源。',
      imagePromptEn: 'Peach Blossom Island, fairy island in the East Sea, peach blossoms blooming like clouds, ingenious mechanism buildings on the island, Huang Yaoshi\'s residence with Qimen Dunjia Go puzzles, surrounded by blue sea and sky. Isometric view, island paradise style.'
    },
    
    // 序章
    {
      mapId: 'daoguan_scene',
      name: '道观静室',
      chapter: 0,
      minLevel: 1,
      worldX: 16,
      worldY: 16,
      imagePromptZh: '等距视角游戏地图素材：中国古代道观建筑，完整的独立建筑物，清晰边界，适合放置在游戏场景中。古朴雅致的道观内有围棋棋盘和木桌。中国水墨画风格，游戏美术资源。',
      imagePromptEn: 'Ancient Chinese Taoist temple meditation room, simple and elegant, with a Go board hanging on the wall, black and white stones on a wooden table, green mountains and clear waters outside the window, sunlight streaming through the lattice windows, creating a peaceful and serene atmosphere. Isometric view, Chinese ink painting style.'
    },
    
    // 第二章 - 大理佛缘（16-25级）
    {
      mapId: 'tianlong_scene',
      name: '天龙寺',
      chapter: 2,
      minLevel: 16,
      worldX: 12,
      worldY: 24,
      imagePromptZh: '等距视角游戏地图素材：大理天龙寺建筑群，完整的独立建筑，清晰边界，适合放置在游戏场景中。金碧辉煌的佛教寺院，大雄宝殿和广场，白族建筑风格。中国古典建筑风格，游戏美术资源。',
      imagePromptEn: 'Tianlong Temple in Dali, magnificent Buddhist temple, monks playing Go in the square in front of the main hall, Cangshan Mountain and Erhai Lake in the distance, Bai ethnic architecture style, solemn yet elegant. Isometric view, Chinese classical architecture style.'
    },
    {
      mapId: 'wuliang_scene',
      name: '无量山',
      chapter: 2,
      minLevel: 18,
      worldX: 10,
      worldY: 26,
      imagePromptZh: '等距视角游戏地图素材：云南无量山场景，完整的独立山景建筑，清晰边界，适合放置在游戏场景中。山腰石台刻有围棋棋盘，古树环绕，云雾缭绕。中国山水画风格，游戏美术资源。',
      imagePromptEn: 'Wuliang Mountain in Yunnan, rolling mountains shrouded in mist, a hidden stone platform halfway up the mountain with a Go board carved on it, surrounded by ancient trees and waterfalls, ethereal atmosphere. Isometric view, Chinese landscape painting style.'
    },
    {
      mapId: 'wanjie_scene',
      name: '万劫谷',
      chapter: 2,
      minLevel: 20,
      worldX: 11,
      worldY: 25,
      imagePromptZh: '等距视角游戏地图素材：万劫谷山谷场景，完整的独立山谷结构，清晰边界，适合放置在游戏场景中。谷底青石刻有围棋棋盘，悬崖峭壁环绕，神秘气氛。戏剧化光影，游戏美术资源。',
      imagePromptEn: 'Valley of Ten Thousand Tribulations, deep valley with a huge bluestone at the bottom, a Go board carved with inner power on the stone, surrounded by steep cliffs, tense and mysterious atmosphere, conveying the seriousness of life-and-death confrontation. Isometric view, dramatic lighting effects.'
    },
    
    // 第三章 - 江南棋会（26-35级）
    {
      mapId: 'meizhuang_scene',
      name: '梅庄',
      chapter: 3,
      minLevel: 26,
      worldX: 26,
      worldY: 20,
      imagePromptZh: '等距视角游戏地图素材：江南梅庄建筑，完整的独立园林建筑，清晰边界，适合放置在游戏场景中。典雅庭院，梅花盛开，书房内有围棋棋谱。江南园林风格，游戏美术资源。',
      imagePromptEn: 'Meizhuang in Jiangnan, elegant classical garden architecture, plum blossoms blooming in the courtyard, ancient Go manuals displayed in the study, famous calligraphy hanging on the walls, full of scholarly atmosphere. Isometric view, Jiangnan garden style.'
    },
    {
      mapId: 'haining_scene',
      name: '海宁',
      chapter: 3,
      minLevel: 30,
      worldX: 27,
      worldY: 18,
      imagePromptZh: '等距视角游戏地图素材：海宁陈阁老府邸，完整的独立官宦建筑，清晰边界，适合放置在游戏场景中。气派大厅，围棋桌和棋子。明清建筑风格，游戏美术资源。',
      imagePromptEn: 'Chen Manor in Haining, grand official residence, exquisite Go table in the center of the hall, black and white stones scattered beside the board (hinting they can be used as hidden weapons), Qiantang River tides in the distance, magnificent momentum. Isometric view, Ming-Qing architecture style.'
    },
    
    // 第四章 - 西域争锋（36-45级）
    {
      mapId: 'kunlun_scene',
      name: '昆仑山',
      chapter: 4,
      minLevel: 36,
      worldX: 4,
      worldY: 10,
      imagePromptZh: '等距视角游戏地图素材：昆仑山巅雪地场景，完整的独立山顶区域，清晰边界，适合放置在游戏场景中。雪地上刻有围棋棋盘，白雪皑皑。高山雪景风格，游戏美术资源。',
      imagePromptEn: 'Summit of Kunlun Mountain, open space on the snowy peak, Go board carved with sword tip on the ground, surrounded by snow, continuous mountains in the distance, vast world conveying the artistic conception of solitary cultivation. Isometric view, alpine snow scenery style.'
    },
    {
      mapId: 'guangming_scene',
      name: '光明顶',
      chapter: 4,
      minLevel: 40,
      worldX: 6,
      worldY: 12,
      imagePromptZh: '等距视角游戏地图素材：光明顶明教总坛建筑，完整的独立石殿建筑，清晰边界，适合放置在游戏场景中。巍峨大厅，日月图腾，太极围棋盘。波斯与中国风格融合，游戏美术资源。',
      imagePromptEn: 'Guangmingding, Ming Cult headquarters, majestic stone hall, huge sun and moon totem hanging in the center, Go board with Taiji pattern on the floor, interplay of light and shadow, mysterious and solemn. Isometric view, fusion of Persian and Chinese elements.'
    },
    
    // 第五章 - 华山论棋（46-50级）
    {
      mapId: 'zhongnan_scene',
      name: '终南山',
      chapter: 5,
      minLevel: 46,
      worldX: 18,
      worldY: 13,
      imagePromptZh: '等距视角游戏地图素材：终南山全真道观建筑群，完整的独立道观建筑，清晰边界，适合放置在游戏场景中。练功场有两张围棋盘，松树环绕。道教建筑风格，游戏美术资源。',
      imagePromptEn: 'Zhongnan Mountain Quanzhen Taoist Temple, simple Taoist architecture complex, two parallel Go boards in the training ground (hinting at ambidextrous technique), surrounded by pine trees, cranes flying, full of Taoist immortal atmosphere. Isometric view, Taoist architecture style.'
    },
    {
      mapId: 'gumu_scene',
      name: '古墓',
      chapter: 5,
      minLevel: 47,
      worldX: 19,
      worldY: 14,
      imagePromptZh: '等距视角游戏地图素材：活死人墓室内场景，完整的独立墓室空间，清晰边界，适合放置在游戏场景中。幽暗墓室，玉石棋盘发光，机关图案。地下墓穴风格，游戏美术资源。',
      imagePromptEn: 'Ancient Tomb, dark underground tomb chamber, stone walls carved with mechanism patterns, glowing Go board (made of jade) on the floor, surrounded by hidden weapon mechanisms, mysterious and dangerous. Isometric view, underground tomb style.'
    },
    {
      mapId: 'leigu_scene',
      name: '擂鼓山',
      chapter: 5,
      minLevel: 48,
      worldX: 20,
      worldY: 15,
      imagePromptZh: '等距视角游戏地图素材：擂鼓山山洞内部，完整的独立洞穴空间，清晰边界，适合放置在游戏场景中。石床上的珍珑棋局发光，神秘气氛。山洞内部风格，游戏美术资源。',
      imagePromptEn: 'Leigu Mountain cave, huge stone bed inside with the legendary Zhenlong Go puzzle, the board emitting a faint glow, bloodstains left by failed challengers scattered around, solemn and sacred atmosphere. Isometric view, cave interior style.'
    }
  ];

  console.log('📋 准备更新的地图：');
  
  let updatedCount = 0;
  let notFoundCount = 0;

  for (const mapData of existingMaps) {
    // 查找地图
    const existingMap = await db.select().from(maps).where(eq(maps.mapId, mapData.mapId));
    
    if (existingMap.length === 0) {
      console.log(`  ❌ 未找到：${mapData.name} (${mapData.mapId})`);
      notFoundCount++;
      continue;
    }

    // 更新地图
    await db.update(maps)
      .set({
        chapter: mapData.chapter,
        minLevel: mapData.minLevel,
        worldX: mapData.worldX,
        worldY: mapData.worldY,
        imagePromptZh: mapData.imagePromptZh,
        imagePromptEn: mapData.imagePromptEn,
        updatedAt: new Date()
      })
      .where(eq(maps.mapId, mapData.mapId));

    const coordInfo = mapData.worldX && mapData.worldY 
      ? `世界坐标: (${mapData.worldX}, ${mapData.worldY})`
      : '(无世界坐标)';
    
    const chapterInfo = mapData.chapter !== null 
      ? `第${mapData.chapter === 0 ? '序' : mapData.chapter}章`
      : '世界地图';
    
    console.log(`  ✅ 更新：${mapData.name} (${mapData.mapId}) - ${chapterInfo}, 等级要求: ${mapData.minLevel}, ${coordInfo}`);
    updatedCount++;
  }

  console.log(`\n📊 统计信息：`);
  console.log(`  - 已更新：${updatedCount} 个地图`);
  console.log(`  - 未找到：${notFoundCount} 个地图`);

  console.log('\n✨ 地图更新完成！');
  console.log('\n💡 提示：');
  console.log('  - 所有已有地图已添加章节、等级要求、世界地图坐标信息');
  console.log('  - 中英文AI生成图片提示词已保存到数据库');
  console.log('  - 可以使用生成脚本根据提示词生成等距图');
  
  process.exit(0);
}

updateExistingMaps().catch(error => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
