#!/usr/bin/env tsx
/**
 * 统计每个地图的NPC数量
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const { db } = await import('../src/db');
  const { maps, npcs } = await import('../src/db/schema');

  const allMaps = await db.select().from(maps);
  const allNpcs = await db.select().from(npcs);

  const counts = new Map<string, number>();
  for (const npc of allNpcs) {
    if (!npc.mapId) continue;
    counts.set(npc.mapId, (counts.get(npc.mapId) || 0) + 1);
  }

  const sortedMaps = [...allMaps].sort((a, b) => a.mapId.localeCompare(b.mapId));

  console.log('📊 每个地图的NPC数量：\n');
  for (const map of sortedMaps) {
    const count = counts.get(map.mapId) || 0;
    console.log(`- ${map.mapId} (${map.name}): ${count}`);
  }

  const unmapped = allNpcs.filter(npc => !npc.mapId);
  if (unmapped.length > 0) {
    console.log('\n⚠️ 未配置mapId的NPC：');
    for (const npc of unmapped) {
      console.log(`- ${npc.npcId} (${npc.name})`);
    }
  }
}

main().catch(error => {
  console.error('❌ 统计失败:', error);
  process.exit(1);
});
