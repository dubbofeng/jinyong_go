import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { mapTiles, maps } from "@/src/db/schema";
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

    return NextResponse.json({
      map,
      tiles,
    });
  } catch (error) {
    console.error("Error fetching map data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
