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
      imagePromptZh: '华山派山门，险峻的山峰，云雾缭绕，石阶蜿蜒而上，山门前有一片开阔的演武场，场上摆放着围棋棋盘，远处是华山五峰的壮丽景色。等距视角，中国山水画风格。',
      imagePromptEn: 'Huashan Sect gate, steep mountain peaks shrouded in clouds, winding stone steps, open martial arts training ground in front of the gate with a Go board, magnificent view of the five peaks of Huashan in the distance. Isometric view, Chinese landscape painting style.'
    },
    {
      mapId: 'shaolin_scene',
      name: '少林寺',
      chapter: 1,
      minLevel: 3,
      worldX: 20,
      worldY: 12,
      imagePromptZh: '嵩山少林寺，千年古刹，大雄宝殿前的广场上有僧人在练武，练功场边有一张石桌石凳，上面摆放着围棋棋盘，佛塔林立，庄严肃穆。等距视角，佛教建筑风格。',
      imagePromptEn: 'Shaolin Temple on Mount Song, thousand-year-old temple, monks practicing martial arts in the square in front of the main hall, stone table and stools at the edge of the training ground with a Go board, pagodas standing tall, solemn and dignified. Isometric view, Buddhist architecture style.'
    },
    {
      mapId: 'xiangyang_scene',
      name: '襄阳城',
      chapter: 1,
      minLevel: 8,
      worldX: 22,
      worldY: 22,
      imagePromptZh: '襄阳城，古代军事重镇，城墙高耸，城门威武，城内街道繁华，茶楼内有文人雅士在下围棋，远处是汉江和城墙的雄伟景象。等距视角，古代城市风格。',
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
      imagePromptZh: '武当山道观，紫霄宫前的广场，道士们在练习太极拳，广场一侧有一张棋桌，棋盘采用太极图案设计，周围青松翠柏，仙气飘飘。等距视角，道教建筑风格。',
      imagePromptEn: 'Wudang Mountain Taoist temple, square in front of Zixiao Palace, Taoists practicing Tai Chi, a chess table on one side of the square with a board designed with Taiji pattern, surrounded by green pines and cypresses, ethereal atmosphere. Isometric view, Taoist architecture style.'
    },
    {
      mapId: 'taohua_scene',
      name: '桃花岛',
      chapter: 3,
      minLevel: 26,
      worldX: 28,
      worldY: 18,
      imagePromptZh: '桃花岛，东海仙岛，桃花盛开如云，岛上有精巧的机关建筑，黄药师的药师精舍内摆放着奇门遁甲棋局，周围是碧海蓝天。等距视角，海岛仙境风格。',
      imagePromptEn: 'Peach Blossom Island, fairy island in the East Sea, peach blossoms blooming like clouds, ingenious mechanism buildings on the island, Huang Yaoshi\'s residence with Qimen Dunjia Go puzzles, surrounded by blue sea and sky. Isometric view, island paradise style.'
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
