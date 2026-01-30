#!/usr/bin/env tsx
/**
 * 生成 NPC 到地图（map_items）
 * - 删除已有 NPC map_items
 * - 按 NPC 的 mapId 放置到对应地图
 * - 尽量远离传送门（portal）
 */

import * as dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, inArray, like, or } from 'drizzle-orm';
import { items, mapItems, maps, npcs } from '../src/db/schema';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
if (!connectionString) {
  throw new Error('POSTGRES_URL or DATABASE_URL environment variable is required');
}

const client = postgres(connectionString);
const db = drizzle(client);

const MIN_PORTAL_DISTANCE = 6; // 最小与传送门距离（格子）
const MAX_ATTEMPTS = 200;

function key(x: number, y: number) {
  return `${x},${y}`;
}

function manhattan(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

async function main() {
  console.log('🧭 生成 NPC 到地图（map_items）...\n');

  const allMaps = await db.select().from(maps);
  const mapByMapId = new Map(allMaps.map(m => [m.mapId, m]));

  const npcItems = await db
    .select({ id: items.id, itemId: items.itemId, itemType: items.itemType })
    .from(items)
    .where(or(eq(items.itemType, 'npc'), like(items.itemId, 'npc_%')));

  const npcItemIds = npcItems.map(i => i.id);
  const npcItemIdByNpcId = new Map<string, number>();
  for (const item of npcItems) {
    if (!item.itemId?.startsWith('npc_')) continue;
    const rawId = item.itemId.replace('npc_', '');
    npcItemIdByNpcId.set(rawId, item.id);
    npcItemIdByNpcId.set(rawId.replace(/_/g, ''), item.id);
  }

  const portalItems = await db
    .select({ id: items.id })
    .from(items)
    .where(or(eq(items.itemType, 'portal'), like(items.itemId, '%portal%')));
  const portalItemIds = portalItems.map(p => p.id);

  if (npcItemIds.length > 0) {
    console.log(`🧹 清理已有 NPC map_items: ${npcItemIds.length} 个 itemId`);
    await db.delete(mapItems).where(inArray(mapItems.itemId, npcItemIds));
  }

  const portalMapItems = portalItemIds.length
    ? await db
        .select({ mapId: mapItems.mapId, x: mapItems.x, y: mapItems.y })
        .from(mapItems)
        .where(inArray(mapItems.itemId, portalItemIds))
    : [];

  const portalPositionsByMap = new Map<number, Array<{ x: number; y: number }>>();
  for (const p of portalMapItems) {
    const list = portalPositionsByMap.get(p.mapId) || [];
    list.push({ x: p.x, y: p.y });
    portalPositionsByMap.set(p.mapId, list);
  }

  const existingMapItems = await db
    .select({ mapId: mapItems.mapId, x: mapItems.x, y: mapItems.y })
    .from(mapItems);

  const occupiedByMap = new Map<number, Set<string>>();
  for (const item of existingMapItems) {
    const set = occupiedByMap.get(item.mapId) || new Set<string>();
    set.add(key(item.x, item.y));
    occupiedByMap.set(item.mapId, set);
  }

  const allNpcs = await db.select().from(npcs);
  const toInsert: Array<{ mapId: number; itemId: number; x: number; y: number }> = [];

  for (const npc of allNpcs) {
    const targetMap = npc.mapId ? mapByMapId.get(npc.mapId) : null;
    if (!targetMap) {
      console.warn(`⚠️  未找到地图: ${npc.mapId} (NPC: ${npc.npcId})`);
      continue;
    }

    const npcId = npc.npcId || '';
    const normalizedNpcId = npcId.replace(/_/g, '');
    const npcItemId =
      npcItemIdByNpcId.get(npcId) ||
      npcItemIdByNpcId.get(normalizedNpcId) ||
      npcItemIdByNpcId.get(normalizedNpcId.replace(/_/g, '')) ||
      npcItemIdByNpcId.get(npcId.replace(/_/g, ''));
    if (!npcItemId) {
      console.warn(`⚠️  未找到 NPC 对应 item: npc_${npc.npcId}`);
      continue;
    }

    const width = targetMap.width || 32;
    const height = targetMap.height || 32;
    const occupied = occupiedByMap.get(targetMap.id) || new Set<string>();
    const portals = portalPositionsByMap.get(targetMap.id) || [];

    const isFarEnough = (x: number, y: number, distance: number) => {
      if (portals.length === 0) return true;
      return portals.every(p => manhattan(p, { x, y }) >= distance);
    };

    const isFree = (x: number, y: number) => !occupied.has(key(x, y));

    const useNpcPosition =
      typeof npc.positionX === 'number' &&
      typeof npc.positionY === 'number' &&
      npc.positionX >= 0 &&
      npc.positionY >= 0 &&
      npc.positionX < width &&
      npc.positionY < height &&
      isFree(npc.positionX, npc.positionY) &&
      isFarEnough(npc.positionX, npc.positionY, MIN_PORTAL_DISTANCE);

    let chosen: { x: number; y: number } | null = null;

    if (useNpcPosition) {
      chosen = { x: npc.positionX, y: npc.positionY };
    } else {
      let minDistance = MIN_PORTAL_DISTANCE;
      while (!chosen && minDistance >= 2) {
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
          const x = Math.floor(Math.random() * width);
          const y = Math.floor(Math.random() * height);
          if (isFree(x, y) && isFarEnough(x, y, minDistance)) {
            chosen = { x, y };
            break;
          }
        }

        if (!chosen) {
          minDistance -= 1;
        }
      }

      if (!chosen) {
        // 最后兜底：遍历全图，选择离传送门最远的位置
        let best: { x: number; y: number; score: number } | null = null;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (!isFree(x, y)) continue;
            const score = portals.length
              ? Math.min(...portals.map(p => manhattan(p, { x, y })))
              : 999;
            if (!best || score > best.score) {
              best = { x, y, score };
            }
          }
        }
        if (best) {
          chosen = { x: best.x, y: best.y };
        }
      }
    }

    if (!chosen) {
      console.warn(`⚠️  无法为 NPC 选择位置: ${npc.npcId}`);
      continue;
    }

    occupied.add(key(chosen.x, chosen.y));
    occupiedByMap.set(targetMap.id, occupied);

    toInsert.push({
      mapId: targetMap.id,
      itemId: npcItemId,
      x: chosen.x,
      y: chosen.y,
    });

    await db
      .update(npcs)
      .set({ positionX: chosen.x, positionY: chosen.y })
      .where(eq(npcs.id, npc.id));
  }

  if (toInsert.length > 0) {
    await db.insert(mapItems).values(toInsert);
  }

  console.log(`\n✅ NPC 生成完成：${toInsert.length} 个 NPC 已放置到 map_items。`);

  await client.end();
}

main().catch(async error => {
  console.error('❌ 生成失败:', error);
  await client.end();
  process.exit(1);
});
