import { db } from '../app/db';
import { maps, mapItems } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

async function setupSceneMaps() {
  console.log('🎮 开始设置场景地图...\n');

  // 获取地图ID
  const allMaps = await db.select().from(maps);
  const worldMap = allMaps.find(m => m.mapId === 'world_map');
  const huashanHall = allMaps.find(m => m.mapId === 'huashan_hall');
  const shaolinTemple = allMaps.find(m => m.mapId === 'shaolin_temple');
  const xiangyangTeahouse = allMaps.find(m => m.mapId === 'xiangyang_teahouse');

  if (!worldMap || !huashanHall || !shaolinTemple || !xiangyangTeahouse) {
    console.error('❌ 找不到所需的地图');
    return;
  }

  console.log('找到的地图：');
  console.log(`  主世界: ${worldMap.name} (ID: ${worldMap.id})`);
  console.log(`  华山: ${huashanHall.name} (ID: ${huashanHall.id})`);
  console.log(`  少林寺: ${shaolinTemple.name} (ID: ${shaolinTemple.id})`);
  console.log(`  襄阳城: ${xiangyangTeahouse.name} (ID: ${xiangyangTeahouse.id})\n`);

  // 清除现有场景地图的物品（如果有的话）
  console.log('🧹 清理现有场景地图物品...');
  await db.delete(mapItems).where(eq(mapItems.mapId, huashanHall.id));
  await db.delete(mapItems).where(eq(mapItems.mapId, shaolinTemple.id));
  await db.delete(mapItems).where(eq(mapItems.mapId, xiangyangTeahouse.id));

  // 在主世界地图添加传送门到场景地图
  console.log('\n🌀 在主世界添加传送门...');
  
  // 删除已存在的传送门（如果有）
  const existingPortals = await db.select().from(mapItems)
    .where(and(
      eq(mapItems.mapId, worldMap.id),
      eq(mapItems.itemType, 'portal')
    ));
  
  for (const portal of existingPortals) {
    if (portal.targetMapId && 
        [huashanHall.mapId, shaolinTemple.mapId, xiangyangTeahouse.mapId].includes(portal.targetMapId)) {
      await db.delete(mapItems).where(eq(mapItems.id, portal.id));
    }
  }

  // 在主世界地图不同位置添加传送门
  const worldPortals = [
    {
      mapId: worldMap.id,
      itemType: 'portal',
      itemName: '华山入口',
      itemPath: '/game/isometric/items/gate-opened01.png',
      x: 10,
      y: 10,
      targetMapId: huashanHall.mapId,
      targetX: 16,
      targetY: 16
    },
    {
      mapId: worldMap.id,
      itemType: 'portal',
      itemName: '少林寺入口',
      itemPath: '/game/isometric/items/gate-opened02.png',
      x: 50,
      y: 10,
      targetMapId: shaolinTemple.mapId,
      targetX: 16,
      targetY: 16
    },
    {
      mapId: worldMap.id,
      itemType: 'portal',
      itemName: '襄阳城入口',
      itemPath: '/game/isometric/items/gate-opened03.png',
      x: 30,
      y: 50,
      targetMapId: xiangyangTeahouse.mapId,
      targetX: 16,
      targetY: 16
    }
  ];

  for (const portal of worldPortals) {
    await db.insert(mapItems).values(portal);
    console.log(`  ✓ 创建传送门: ${portal.itemName} (${portal.x}, ${portal.y})`);
  }

  // 在华山添加洪七公和返回传送门
  console.log('\n🏔️ 设置华山...');
  const huashanItems = [
    {
      mapId: huashanHall.id,
      itemType: 'npc',
      itemName: '洪七公',
      itemPath: '/game/isometric/characters/npc_hong_qigong.png',
      x: 16,
      y: 12,
      targetMapId: null,
      targetX: null,
      targetY: null
    },
    {
      mapId: huashanHall.id,
      itemType: 'portal',
      itemName: '返回主世界',
      itemPath: '/game/isometric/items/gate-opened01.png',
      x: 16,
      y: 28,
      targetMapId: worldMap.mapId,
      targetX: 10,
      targetY: 12
    }
  ];

  for (const item of huashanItems) {
    await db.insert(mapItems).values(item);
    console.log(`  ✓ 创建${item.itemType === 'npc' ? 'NPC' : '传送门'}: ${item.itemName}`);
  }

  // 在少林寺添加令狐冲和返回传送门
  console.log('\n🏯 设置少林寺...');
  const shaolinItems = [
    {
      mapId: shaolinTemple.id,
      itemType: 'npc',
      itemName: '令狐冲',
      itemPath: '/game/isometric/characters/npc_linghu_chong.png',
      x: 16,
      y: 12,
      targetMapId: null,
      targetX: null,
      targetY: null
    },
    {
      mapId: shaolinTemple.id,
      itemType: 'portal',
      itemName: '返回主世界',
      itemPath: '/game/isometric/items/gate-opened02.png',
      x: 16,
      y: 28,
      targetMapId: worldMap.mapId,
      targetX: 50,
      targetY: 12
    }
  ];

  for (const item of shaolinItems) {
    await db.insert(mapItems).values(item);
    console.log(`  ✓ 创建${item.itemType === 'npc' ? 'NPC' : '传送门'}: ${item.itemName}`);
  }

  // 在襄阳城添加郭靖和返回传送门
  console.log('\n🏛️ 设置襄阳城...');
  const xiangyangItems = [
    {
      mapId: xiangyangTeahouse.id,
      itemType: 'npc',
      itemName: '郭靖',
      itemPath: '/game/isometric/characters/npc_guo_jing.png',
      x: 16,
      y: 12,
      targetMapId: null,
      targetX: null,
      targetY: null
    },
    {
      mapId: xiangyangTeahouse.id,
      itemType: 'portal',
      itemName: '返回主世界',
      itemPath: '/game/isometric/items/gate-opened03.png',
      x: 16,
      y: 28,
      targetMapId: worldMap.mapId,
      targetX: 30,
      targetY: 52
    }
  ];

  for (const item of xiangyangItems) {
    await db.insert(mapItems).values(item);
    console.log(`  ✓ 创建${item.itemType === 'npc' ? 'NPC' : '传送门'}: ${item.itemName}`);
  }

  console.log('\n✅ 场景地图设置完成！');
  console.log('\n📍 地图位置总览：');
  console.log('主世界传送门：');
  console.log('  - 华山入口: (10, 10) → 华山 (16, 16)');
  console.log('  - 少林寺入口: (50, 10) → 少林寺 (16, 16)');
  console.log('  - 襄阳城入口: (30, 50) → 襄阳城 (16, 16)');
  console.log('\n华山：');
  console.log('  - 洪七公: (16, 12)');
  console.log('  - 返回传送门: (16, 28) → 主世界 (10, 12)');
  console.log('\n少林寺：');
  console.log('  - 令狐冲: (16, 12)');
  console.log('  - 返回传送门: (16, 28) → 主世界 (50, 12)');
  console.log('\n襄阳城：');
  console.log('  - 郭靖: (16, 12)');
  console.log('  - 返回传送门: (16, 28) → 主世界 (30, 52)');
}

setupSceneMaps()
  .then(() => {
    console.log('\n🎉 所有设置完成！现在可以在游戏中体验场景地图了。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 设置失败:', error);
    process.exit(1);
  });
