import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { mapTiles, maps, mapItems } from "@/src/db/schema";
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
    const items = await db
      .select()
      .from(mapItems)
      .where(eq(mapItems.mapId, map.id));

    // Convert tiles to 2D array for easier rendering
    const tilesArray: any[][] = Array.from({ length: map.height }, () =>
      Array.from({ length: map.width }, () => null)
    );

    for (const tile of tiles) {
      if (tile.y >= 0 && tile.y < map.height && tile.x >= 0 && tile.x < map.width) {
        tilesArray[tile.y][tile.x] = {
          x: tile.x,
          y: tile.y,
          tileType: tile.tileType,
          walkable: tile.tileType !== 'water', // Water is not walkable
        };
      }
    }

    return NextResponse.json({
      id: map.mapId,
      name: map.name,
      width: map.width,
      height: map.height,
      tiles: tilesArray,
      items: items.map(item => ({
        id: item.id,
        itemName: item.itemName,
        itemPath: item.itemPath,
        itemType: item.itemType,
        x: item.x,
        y: item.y,
        blocking: item.itemType === 'building' || item.itemType === 'npc',
        targetMapId: item.targetMapId,
        targetX: item.targetX,
        targetY: item.targetY,
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
