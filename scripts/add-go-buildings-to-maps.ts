import 'dotenv/config';
import { db } from '../app/db';
import { items, mapItems, maps } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const TARGET_ITEMS = ['go_hall', 'go_pavilion'];

const canPlace = (
  x: number,
  y: number,
  size: number,
  mapWidth: number,
  mapHeight: number,
  occupied: { x: number; y: number; size: number }[]
) => {
  const edgeMargin = Math.ceil(size / 2) + 1;
  if (x < edgeMargin || y < edgeMargin || x >= mapWidth - edgeMargin || y >= mapHeight - edgeMargin) {
    return false;
  }

  for (const pos of occupied) {
    const itemSize = pos.size || 1;
    const minDistance = Math.max(size, itemSize) + 1;
    if (Math.abs(x - pos.x) < minDistance && Math.abs(y - pos.y) < minDistance) {
      return false;
    }
  }

  return true;
};

const findSpot = (
  mapWidth: number,
  mapHeight: number,
  size: number,
  occupied: { x: number; y: number; size: number }[]
) => {
  const maxAttempts = 300;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const x = Math.floor(Math.random() * mapWidth);
    const y = Math.floor(Math.random() * mapHeight);
    if (canPlace(x, y, size, mapWidth, mapHeight, occupied)) {
      return { x, y };
    }
  }
  return null;
};

async function addBuildingsToMaps() {
  const allMaps = await db.select().from(maps);
  const itemsMap = new Map<string, typeof items.$inferSelect>();
  for (const itemId of TARGET_ITEMS) {
    const [item] = await db.select().from(items).where(eq(items.itemId, itemId)).limit(1);
    if (item) {
      itemsMap.set(itemId, item);
    } else {
      console.warn(`⚠️  未找到物品 ${itemId}，请先运行 init-items.ts`);
    }
  }

  for (const map of allMaps) {
    const existingItems = await db
      .select({
        x: mapItems.x,
        y: mapItems.y,
        size: items.size,
        itemId: items.itemId,
      })
      .from(mapItems)
      .leftJoin(items, eq(mapItems.itemId, items.id))
      .where(eq(mapItems.mapId, map.id));

    const occupied = existingItems.map((entry) => ({
      x: entry.x,
      y: entry.y,
      size: entry.size || 1,
    }));

    for (const itemId of TARGET_ITEMS) {
      const item = itemsMap.get(itemId);
      if (!item) continue;

      const already = existingItems.some((entry) => entry.itemId === itemId);
      if (already) continue;

      const size = item.size || 1;
      const spot = findSpot(map.width || 40, map.height || 40, size, occupied);
      if (!spot) {
        console.warn(`⚠️  ${map.mapId} 没有找到可放置 ${itemId} 的位置`);
        continue;
      }

      await db.insert(mapItems).values({
        mapId: map.id,
        itemId: item.id,
        x: spot.x,
        y: spot.y,
      });

      occupied.push({ x: spot.x, y: spot.y, size });
      console.log(`✅ ${map.mapId} 添加 ${item.name} (${spot.x}, ${spot.y})`);
    }
  }
}

addBuildingsToMaps()
  .then(() => {
    console.log('🎉 已为所有地图添加棋馆/弈亭');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 添加失败:', error);
    process.exit(1);
  });
