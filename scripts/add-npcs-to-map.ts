/**
 * 将NPC添加到等距地图中作为mapItems
 */

import { db } from '../src/db';
import { maps, mapItems } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

async function addNPCsToMaps() {
  console.log('🎭 开始添加NPC到地图...');

  // 定义NPC的位置和属性（添加到场景地图）
  const npcConfigs = [
    {
      mapId: 'huashan_hall',
      itemName: '洪七公',
      itemPath: '/game/isometric/characters/npc_hong_qigong.png',
      itemType: 'npc',
      x: 16, // 地图中心区域
      y: 12,
      blocking: true, // NPC不可行走
    },
    {
      mapId: 'shaolin_temple',
      itemName: '令狐冲',
      itemPath: '/game/isometric/characters/npc_linghu_chong.png',
      itemType: 'npc',
      x: 16,
      y: 12,
      blocking: true,
    },
    {
      mapId: 'xiangyang_teahouse',
      itemName: '郭靖',
      itemPath: '/game/isometric/characters/npc_guo_jing.png',
      itemType: 'npc',
      x: 16,
      y: 12,
      blocking: true,
    },
    {
      mapId: 'xiangyang_teahouse',
      itemName: '黄蓉',
      itemPath: '/game/isometric/characters/npc_huang_rong.png',
      itemType: 'npc',
      x: 14,
      y: 14,
      blocking: true,
    }
  ];

  for (const config of npcConfigs) {
    try {
      // 查找地图
      const mapList = await db
        .select()
        .from(maps)
        .where(eq(maps.mapId, config.mapId))
        .limit(1);

      if (mapList.length === 0) {
        console.log(`⚠️  地图 "${config.mapId}" 不存在，跳过NPC: ${config.itemName}`);
        continue;
      }

      const map = mapList[0];

      // 检查NPC是否已存在
      const existingItems = await db
        .select()
        .from(mapItems)
        .where(
          and(
            eq(mapItems.mapId, map.id),
            eq(mapItems.itemName, config.itemName)
          )
        )
        .limit(1);

      if (existingItems.length > 0) {
        console.log(`ℹ️  NPC "${config.itemName}" 已存在于地图 "${config.mapId}" 中`);
        continue;
      }

      // 添加NPC到mapItems表
      await db.insert(mapItems).values({
        mapId: map.id,
        itemName: config.itemName,
        itemPath: config.itemPath,
        itemType: config.itemType,
        x: config.x,
        y: config.y,
        blocking: config.blocking,
      });

      console.log(`✅ 添加NPC "${config.itemName}" 到地图 "${config.mapId}" @ (${config.x}, ${config.y})`);
    } catch (error) {
      console.error(`❌ 添加NPC "${config.itemName}" 失败:`, error);
    }
  }

  console.log('🎉 NPC添加完成！');
}

addNPCsToMaps()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
