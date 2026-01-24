/**
 * 初始化示例地图数据
 * 运行：npx tsx scripts/init-maps.ts
 */

import { db } from '../src/db';
import { maps } from '../src/db/schema';
import { generateWorldMap, generateWuxiaSceneMap } from '../src/lib/map/mapGenerator';

async function initMaps() {
  console.log('🗺️  初始化地图系统...\n');

  try {
    // 创建世界地图
    console.log('1️⃣  创建世界地图...');
    const [worldMap] = await db
      .insert(maps)
      .values({
        mapId: 'world_map',
        name: '武林世界',
        mapType: 'world',
        description: '武林各大门派分布图',
        width: 64,
        height: 64,
      })
      .returning();

    await generateWorldMap(worldMap.id, 64, 64);
    console.log('   ✅ 世界地图创建成功\n');

    // 创建华山场景
    console.log('2️⃣  创建华山场景...');
    const [huashanMap] = await db
      .insert(maps)
      .values({
        mapId: 'huashan_scene',
        name: '华山',
        mapType: 'scene',
        description: '华山派所在地，以险峻著称',
        width: 32,
        height: 32,
      })
      .returning();

    await generateWuxiaSceneMap(huashanMap.id, 32, 32, 'mountain');
    console.log('   ✅ 华山场景创建成功\n');

    // 创建少林场景
    console.log('3️⃣  创建少林场景...');
    const [shaolinMap] = await db
      .insert(maps)
      .values({
        mapId: 'shaolin_scene',
        name: '少林寺',
        mapType: 'scene',
        description: '武林泰斗少林寺',
        width: 32,
        height: 32,
      })
      .returning();

    await generateWuxiaSceneMap(shaolinMap.id, 32, 32, 'forest');
    console.log('   ✅ 少林场景创建成功\n');

    // 创建武当场景
    console.log('4️⃣  创建武当场景...');
    const [wudangMap] = await db
      .insert(maps)
      .values({
        mapId: 'wudang_scene',
        name: '武当山',
        mapType: 'scene',
        description: '武当派圣地',
        width: 32,
        height: 32,
      })
      .returning();

    await generateWuxiaSceneMap(wudangMap.id, 32, 32, 'mountain');
    console.log('   ✅ 武当场景创建成功\n');

    // 创建桃花岛场景
    console.log('5️⃣  创建桃花岛场景...');
    const [taohuaMap] = await db
      .insert(maps)
      .values({
        mapId: 'taohua_scene',
        name: '桃花岛',
        mapType: 'scene',
        description: '黄药师隐居之地',
        width: 32,
        height: 32,
      })
      .returning();

    await generateWuxiaSceneMap(taohuaMap.id, 32, 32, 'forest');
    console.log('   ✅ 桃花岛场景创建成功\n');

    console.log('🎉 地图初始化完成！\n');
    console.log('访问以下页面查看：');
    console.log('  - 世界地图: /map/world_map');
    console.log('  - 华山: /map/huashan_scene');
    console.log('  - 少林寺: /map/shaolin_scene');
    console.log('  - 武当山: /map/wudang_scene');
    console.log('  - 桃花岛: /map/taohua_scene');
    console.log('\n地图编辑器: /map-editor\n');

  } catch (error: any) {
    if (error.code === '23505') {
      console.error('❌ 地图已存在，请先删除旧数据或使用不同的 mapId');
    } else {
      console.error('❌ 初始化失败:', error);
    }
    process.exit(1);
  }

  process.exit(0);
}

initMaps();
