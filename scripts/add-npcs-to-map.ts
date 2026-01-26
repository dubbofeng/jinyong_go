/**
 * 将NPC添加到等距地图中作为mapItems
 * 重构后：先在items表创建NPC定义，再在map_items创建实例
 */

import { db } from '../app/db';
import { maps, mapItems, items } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

async function addNPCsToMaps() {
  console.log('🎭 开始添加NPC到地图...');

  // 第一步：确保NPC在items表中存在
  const npcDefinitions = [
    {
      itemId: 'npc_hong_qigong',
      name: '洪七公',
      nameEn: 'Hong Qigong',
      description: '丐帮帮主，武功高强',
      itemType: 'decoration', // NPC暂时用decoration类型
      category: 'npc',
      imagePath: '/game/isometric/characters/npc_hong_qigong.png',
      size: 1,
      blocking: true,
      interactable: true,
      rarity: 'legendary',
    },
    {
      itemId: 'npc_linghu_chong',
      name: '令狐冲',
      nameEn: 'Linghu Chong',
      description: '华山派大弟子',
      itemType: 'decoration',
      category: 'npc',
      imagePath: '/game/isometric/characters/npc_linghu_chong.png',
      size: 1,
      blocking: true,
      interactable: true,
      rarity: 'legendary',
    },
    {
      itemId: 'npc_guo_jing',
      name: '郭靖',
      nameEn: 'Guo Jing',
      description: '大侠郭靖',
      itemType: 'decoration',
      category: 'npc',
      imagePath: '/game/isometric/characters/npc_guo_jing.png',
      size: 1,
      blocking: true,
      interactable: true,
      rarity: 'legendary',
    },
    {
      itemId: 'npc_huang_rong',
      name: '黄蓉',
      nameEn: 'Huang Rong',
      description: '聪慧过人的黄蓉',
      itemType: 'decoration',
      category: 'npc',
      imagePath: '/game/isometric/characters/npc_huang_rong.png',
      size: 1,
      blocking: true,
      interactable: true,
      rarity: 'legendary',
    },
  ];

  console.log('\n📝 第一步：添加NPC定义到items表...');
  for (const npcDef of npcDefinitions) {
    try {
      // 检查是否已存在
      const existing = await db
        .select()
        .from(items)
        .where(eq(items.itemId, npcDef.itemId))
        .limit(1);

      if (existing.length > 0) {
        console.log(`  ⏭️  NPC定义已存在: ${npcDef.name}`);
        continue;
      }

      await db.insert(items).values(npcDef as any);
      console.log(`  ✅ 添加NPC定义: ${npcDef.name}`);
    } catch (error) {
      console.error(`  ❌ 添加NPC定义失败: ${npcDef.name}`, error);
    }
  }

  // 第二步：在地图上添加NPC实例
  console.log('\n🗺️  第二步：在地图上添加NPC实例...');
  
  // 定义NPC的位置和属性（添加到场景地图）
  const npcPlacements = [
    {
      mapId: 'huashan_hall',
      itemId: 'npc_hong_qigong',
      x: 16, // 地图中心区域
      y: 12,
    },
    {
      mapId: 'shaolin_temple',
      itemId: 'npc_linghu_chong',
      x: 16,
      y: 12,
    },
    {
      mapId: 'xiangyang_teahouse',
      itemId: 'npc_guo_jing',
      x: 16,
      y: 12,
    },
    {
      mapId: 'xiangyang_teahouse',
      itemId: 'npc_huang_rong',
      x: 14,
      y: 14,
    }
  ];

  for (const placement of npcPlacements) {
    try {
      // 查找地图
      const mapList = await db
        .select()
        .from(maps)
        .where(eq(maps.mapId, placement.mapId))
        .limit(1);

      if (mapList.length === 0) {
        console.log(`  ⚠️  地图 "${placement.mapId}" 不存在，跳过NPC: ${placement.itemId}`);
        continue;
      }

      const map = mapList[0];

      // 查找NPC的item记录
      const npcItemList = await db
        .select()
        .from(items)
        .where(eq(items.itemId, placement.itemId))
        .limit(1);

      if (npcItemList.length === 0) {
        console.log(`  ⚠️  NPC定义 "${placement.itemId}" 不存在`);
        continue;
      }

      const npcItem = npcItemList[0];

      // 检查NPC实例是否已存在
      const existingInstances = await db
        .select()
        .from(mapItems)
        .where(
          and(
            eq(mapItems.mapId, map.id),
            eq(mapItems.itemId, npcItem.id)
          )
        )
        .limit(1);

      if (existingInstances.length > 0) {
        console.log(`  ℹ️  NPC "${npcItem.name}" 已存在于地图 "${placement.mapId}"`);
        continue;
      }

      // 添加NPC实例到mapItems表
      await db.insert(mapItems).values({
        mapId: map.id,
        itemId: npcItem.id,
        x: placement.x,
        y: placement.y,
      });

      console.log(`  ✅ 添加NPC "${npcItem.name}" 到地图 "${placement.mapId}" @ (${placement.x}, ${placement.y})`);
    } catch (error) {
      console.error(`  ❌ 添加NPC实例失败: ${placement.itemId}`, error);
    }
  }

  console.log('\n🎉 NPC添加完成！');
}

addNPCsToMaps()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
