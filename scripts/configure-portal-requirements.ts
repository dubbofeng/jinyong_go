/**
 * 配置传送门解锁条件
 * 序章传送门要求：
 * - 华山：无限制（起始地图）
 * - 少林：需要完成"初识围棋"任务
 * - 襄阳：需要击败令狐冲
 */

import 'dotenv/config';
import { db } from '../app/db';
import { mapItems, items, maps } from '../src/db/schema';
import { eq, and, like } from 'drizzle-orm';

async function configurePortalRequirements() {
  console.log('🌀 开始配置传送门解锁条件...\n');

  // 先找到传送门itemId
  const portalItems = await db
    .select()
    .from(items)
    .where(like(items.itemId, '%portal%'));
  
  if (portalItems.length === 0) {
    console.log('❌ 未找到传送门物品定义');
    process.exit(1);
  }
  
  const portalItemId = portalItems[0].id;
  console.log(`📍 找到传送门物品ID: ${portalItemId}`);

  // 找到地图IDs
  const allMaps = await db.select().from(maps);
  const huashanMap = allMaps.find(m => m.mapId === 'huashan_scene');
  const shaolinMap = allMaps.find(m => m.mapId === 'shaolin_scene');
  const xiangyangMap = allMaps.find(m => m.mapId === 'xiangyang_scene');

  // 1. 华山传送门 - 无限制（默认已无requirements）
  console.log('\n🏔️ 华山传送门：无限制');
  if (huashanMap) {
    const huashanPortals = await db
      .select()
      .from(mapItems)
      .where(and(
        eq(mapItems.itemId, portalItemId),
        eq(mapItems.sceneLinkMapId, 'huashan_scene')
      ));
    
    if (huashanPortals.length > 0) {
      for (const portal of huashanPortals) {
        await db
          .update(mapItems)
          .set({ requirements: null })
          .where(eq(mapItems.id, portal.id));
        console.log(`  ✅ 传送门 ID ${portal.id} (${portal.x}, ${portal.y}) - 无限制`);
      }
    } else {
      console.log('  ⚠️  未找到通往华山的传送门');
    }
  }

  // 2. 少林传送门 - 需要完成"初识围棋"任务
  console.log('\n🏯 少林传送门：需要完成"初识围棋"任务');
  if (shaolinMap) {
    const shaolinPortals = await db
      .select()
      .from(mapItems)
      .where(and(
        eq(mapItems.itemId, portalItemId),
        eq(mapItems.sceneLinkMapId, 'shaolin_scene')
      ));
    
    const shaolinRequirements = [
      {
        type: 'quest_completed',
        questId: 'intro_to_go',
        description: '完成"初识围棋"任务',
      },
    ];
    
    if (shaolinPortals.length > 0) {
      for (const portal of shaolinPortals) {
        await db
          .update(mapItems)
          .set({ requirements: shaolinRequirements as any })
          .where(eq(mapItems.id, portal.id));
        console.log(`  ✅ 传送门 ID ${portal.id} (${portal.x}, ${portal.y}) - 需要完成"初识围棋"`);
      }
    } else {
      console.log('  ⚠️  未找到通往少林的传送门');
    }
  }

  // 3. 襄阳传送门 - 需要击败令狐冲
  console.log('\n🏛️  襄阳传送门：需要击败令狐冲');
  if (xiangyangMap) {
    const xiangyangPortals = await db
      .select()
      .from(mapItems)
      .where(and(
        eq(mapItems.itemId, portalItemId),
        eq(mapItems.sceneLinkMapId, 'xiangyang_scene')
      ));
    
    const xiangyangRequirements = [
      {
        type: 'npc_defeated',
        npcId: 'linghuchong',
        description: '击败令狐冲',
      },
    ];
    
    if (xiangyangPortals.length > 0) {
      for (const portal of xiangyangPortals) {
        await db
          .update(mapItems)
          .set({ requirements: xiangyangRequirements as any })
          .where(eq(mapItems.id, portal.id));
        console.log(`  ✅ 传送门 ID ${portal.id} (${portal.x}, ${portal.y}) - 需要击败令狐冲`);
      }
    } else {
      console.log('  ⚠️  未找到通往襄阳的传送门');
    }
  }

  console.log('\n✨ 传送门条件配置完成！');
  process.exit(0);
}

configurePortalRequirements().catch((error) => {
  console.error('❌ 配置传送门条件失败:', error);
  process.exit(1);
});
