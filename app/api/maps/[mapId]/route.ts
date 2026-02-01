import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { mapTiles, maps, mapItems, items } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { mapId: string } }
) {
  const mapId = params.mapId;

  if (!mapId) {
    return NextResponse.json({ error: "Invalid map ID" }, { status: 400 });
  }

  try {
    // Check if mapId is a number (database id) or string (mapId field)
    const isNumericId = /^\d+$/.test(mapId);
    
    // Get map info
    const [map] = isNumericId
      ? await db.select().from(maps).where(eq(maps.id, parseInt(mapId)))
      : await db.select().from(maps).where(eq(maps.mapId, mapId));

    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    // Get all tiles for this map
    const tiles = await db
      .select()
      .from(mapTiles)
      .where(eq(mapTiles.mapId, map.id))
      .orderBy(mapTiles.y, mapTiles.x);

    // Get all items for this map (NPCs, buildings, portals, decorations)
    // JOIN with items table to get item details
    const itemsData = await db
      .select({
        id: mapItems.id,
        x: mapItems.x,
        y: mapItems.y,
        dialogueId: mapItems.dialogueId,
        questId: mapItems.questId,
        sceneLinkMapId: mapItems.sceneLinkMapId,
        sceneLinkX: mapItems.sceneLinkX,
        sceneLinkY: mapItems.sceneLinkY,
        enabled: mapItems.enabled,
        collected: mapItems.collected,
        metadata: mapItems.metadata,
        // Item details from items table
        itemId: items.itemId,
        itemName: items.name,
        itemPath: items.imagePath,
        itemType: items.itemType,
        blocking: items.blocking,
        interactable: items.interactable,
        size: items.size,
        animated: items.animated,
        animationPath: items.animationPath,
        frameCount: items.frameCount,
      })
      .from(mapItems)
      .leftJoin(items, eq(mapItems.itemId, items.id))
      .where(eq(mapItems.mapId, map.id));

    // Convert tiles to 2D array for easier rendering
    const tilesArray: any[][] = Array.from({ length: map.height }, () =>
      Array.from({ length: map.width }, () => null)
    );

    // 地形类型映射：数字 -> 字符串
    const terrainTypeMap: { [key: number]: string } = {
      1: 'wood',   // 草地
      2: 'gold',   // 装饰
      3: 'dirt',   // 道路
      4: 'fire',   // 边界
      5: 'water',  // 水域
    };

    for (const tile of tiles) {
      if (tile.y >= 0 && tile.y < map.height && tile.x >= 0 && tile.x < map.width) {
        const tileTypeStr = terrainTypeMap[tile.tileType as number] || 'wood';
        tilesArray[tile.y][tile.x] = {
          x: tile.x,
          y: tile.y,
          tileType: tileTypeStr,
          walkable: tileTypeStr !== 'water', // Water is not walkable
        };
      }
    }

    const chestOpenMap: Record<string, string> = {
      chest01: '/game/isometric/items/chest05.png',
      chest02: '/game/isometric/items/chest06.png',
    };

    return NextResponse.json({
      id: map.mapId,
      name: map.name,
      width: map.width,
      height: map.height,
      tiles: tilesArray,
      items: itemsData.map(item => ({
        id: item.id,
        itemId: item.itemId,
        itemName: item.itemName,
        itemPath:
          (item.collected || item.metadata?.state === 'opened') && item.itemId && chestOpenMap[item.itemId]
            ? chestOpenMap[item.itemId]
            : item.itemPath,
        itemType: item.itemType,
        x: item.x,
        y: item.y,
        blocking: item.blocking || false,
        interactable: item.interactable || false,
        size: item.size || 1,
        dialogueId: item.dialogueId,
        questId: item.questId,
        collected: item.collected || false,
        properties: item.metadata || {},
        // Portal/scene transition support (兼容旧的targetMapId命名)
        targetMapId: item.sceneLinkMapId,
        targetX: item.sceneLinkX,
        targetY: item.sceneLinkY,
        // Animation support
        animated: item.animated || false,
        animationPath: item.animationPath,
        frameCount: item.frameCount,
      })),
    });
  } catch (error) {
    console.error("Error fetching map data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { mapId: string } }
) {
  const mapId = params.mapId;

  if (!mapId) {
    return NextResponse.json({ error: "Invalid map ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, description, tiles } = body;

    // Check if mapId is a number (database id) or string (mapId field)
    const isNumericId = /^\d+$/.test(mapId);
    
    // Get map info
    const [map] = isNumericId
      ? await db.select().from(maps).where(eq(maps.id, parseInt(mapId)))
      : await db.select().from(maps).where(eq(maps.mapId, mapId));

    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    // Update map metadata if provided
    if (name || description !== undefined) {
      await db
        .update(maps)
        .set({
          ...(name && { name }),
          ...(description !== undefined && { description }),
        })
        .where(eq(maps.id, map.id));
    }

    // Update tiles if provided
    if (tiles && Array.isArray(tiles)) {
      // Delete existing tiles
      await db.delete(mapTiles).where(eq(mapTiles.mapId, map.id));

      // Insert new tiles
      const tilesToInsert = [];
      for (let y = 0; y < tiles.length; y++) {
        for (let x = 0; x < tiles[y].length; x++) {
          const tile = tiles[y][x];
          if (tile) {
            tilesToInsert.push({
              mapId: map.id,
              x,
              y,
              tileType: tile.tileType,
            });
          }
        }
      }

      if (tilesToInsert.length > 0) {
        await db.insert(mapTiles).values(tilesToInsert);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating map:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
