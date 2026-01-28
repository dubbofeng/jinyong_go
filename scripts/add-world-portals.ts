import 'dotenv/config';
import { db } from '../app/db';
import { maps, mapItems, items } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

async function addWorldPortals() {
  console.log('🌍 开始在世界地图添加传送门...\n');

  // 获取地图
  const allMaps = await db.select().from(maps);
  const worldMap = allMaps.find(m => m.mapId === 'world_map');
  const huashanScene = allMaps.find(m => m.mapId === 'huashan_scene');
  const shaolinScene = allMaps.find(m => m.mapId === 'shaolin_scene');
  const wudangScene = allMaps.find(m => m.mapId === 'wudang_scene');
  const taohuaScene = allMaps.find(m => m.mapId === 'taohua_scene');

  if (!worldMap) {
    console.error('❌ 找不到世界地图');
    process.exit(1);
  }

  console.log('📍 找到的地图：');
  console.log(`  世界地图: ${worldMap.name} (ID: ${worldMap.id})`);
  if (huashanScene) console.log(`  华山: ${huashanScene.name} (ID: ${huashanScene.id})`);
  if (shaolinScene) console.log(`  少林寺: ${shaolinScene.name} (ID: ${shaolinScene.id})`);
  if (wudangScene) console.log(`  武当山: ${wudangScene.name} (ID: ${wudangScene.id})`);
  if (taohuaScene) console.log(`  桃花岛: ${taohuaScene.name} (ID: ${taohuaScene.id})`);

  // 获取传送门物品ID
  const portalItem = await db.select().from(items).where(eq(items.itemId, 'portal_default'));
  if (portalItem.length === 0) {
    console.error('❌ 找不到传送门物品定义');
    process.exit(1);
  }
  const portalItemId = portalItem[0].id;
  console.log(`\n🚪 传送门物品ID: ${portalItemId}`);

  // 删除world_map上现有的传送门（如果有）
  const existingPortals = await db
    .select()
    .from(mapItems)
    .where(and(
      eq(mapItems.mapId, worldMap.id),
      eq(mapItems.itemId, portalItemId)
    ));

  if (existingPortals.length > 0) {
    console.log(`\n🧹 删除 ${existingPortals.length} 个现有传送门...`);
    for (const portal of existingPortals) {
      await db.delete(mapItems).where(eq(mapItems.id, portal.id));
    }
  }

  // 在world_map上添加传送门（按照中国地图方位）
  console.log('\n🌀 创建传送门（按中国地图方位布局）...');

  const portalsToAdd = [];

  // 1. 华山传送门（西边 - 陕西）
  if (huashanScene) {
    portalsToAdd.push({
      mapId: worldMap.id,
      itemId: portalItemId,
      x: 8,
      y: 15,
      sceneLinkMapId: huashanScene.mapId,
      sceneLinkX: 24,
      sceneLinkY: 26,
      enabled: true,
      requirements: null,
      metadata: { name: '华山入口', location: 'west' }
    });
  }

  // 2. 少林寺传送门（中部 - 河南）
  if (shaolinScene) {
    portalsToAdd.push({
      mapId: worldMap.id,
      itemId: portalItemId,
      x: 20,
      y: 12,
      sceneLinkMapId: shaolinScene.mapId,
      sceneLinkX: 24,
      sceneLinkY: 26,
      enabled: true,
      requirements: [
        {
          type: 'quest_completed',
          questId: 'intro_to_go',
          description: '完成"初识围棋"任务'
        }
      ],
      metadata: { name: '少林寺入口', location: 'center' }
    });
  }

  // 3. 武当山传送门（中部偏南 - 湖北）
  if (wudangScene) {
    portalsToAdd.push({
      mapId: worldMap.id,
      itemId: portalItemId,
      x: 18,
      y: 20,
      sceneLinkMapId: wudangScene.mapId,
      sceneLinkX: 24,
      sceneLinkY: 26,
      enabled: true,
      requirements: null,
      metadata: { name: '武当山入口', location: 'center-south' }
    });
  }

  // 4. 襄阳传送门（中部偏南 - 湖北）
  const xiangyangScene = allMaps.find(m => m.mapId === 'xiangyang_scene');
  if (xiangyangScene) {
    portalsToAdd.push({
      mapId: worldMap.id,
      itemId: portalItemId,
      x: 22,
      y: 22,
      sceneLinkMapId: xiangyangScene.mapId,
      sceneLinkX: 24,
      sceneLinkY: 26,
      enabled: true,
      requirements: [
        {
          type: 'npc_defeated',
          npcId: 'linghu_chong',
          description: '击败令狐冲'
        }
      ],
      metadata: { name: '襄阳入口', location: 'center-south' }
    });
  }

  // 5. 桃花岛传送门（东边 - 浙江舟山）
  if (taohuaScene) {
    portalsToAdd.push({
      mapId: worldMap.id,
      itemId: portalItemId,
      x: 28,
      y: 18,
      sceneLinkMapId: taohuaScene.mapId,
      sceneLinkX: 24,
      sceneLinkY: 26,
      enabled: true,
      requirements: null,
      metadata: { name: '桃花岛入口', location: 'east' }
    });
  }

  // 插入传送门
  for (const portal of portalsToAdd) {
    const inserted = await db.insert(mapItems).values(portal as any).returning();
    const metadata = portal.metadata as any;
    const reqs = portal.requirements ? '（有条件）' : '（无限制）';
    console.log(`  ✅ ${metadata.name} ${reqs} - ID: ${inserted[0].id}, 位置: (${portal.x}, ${portal.y}) → ${portal.sceneLinkMapId}`);
  }

  console.log('\n✨ 世界地图传送门创建完成！');
  console.log(`\n总计创建了 ${portalsToAdd.length} 个传送门。`);

  process.exit(0);
}

addWorldPortals().catch(error => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
