import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { maps } from "@/src/db/schema";
import {
  generateAndSaveMapTiles,
  generateWuxiaSceneMap,
  generateWorldMap,
} from "@/src/lib/map/mapGenerator";

// POST: Generate a new map with tiles
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mapId,
      name,
      mapType = "scene",
      width = 32,
      height = 32,
      theme = "forest",
      description,
    } = body;

    if (!mapId || !name) {
      return NextResponse.json(
        { error: "Missing required fields: mapId and name" },
        { status: 400 }
      );
    }

    // Create the map entry
    const [newMap] = await db
      .insert(maps)
      .values({
        mapId,
        name,
        mapType,
        description,
        width,
        height,
      })
      .returning();

    // Generate tiles based on map type
    let result;
    if (mapType === "world") {
      result = await generateWorldMap(newMap.id, width, height);
    } else {
      // Scene map with theme
      result = await generateWuxiaSceneMap(newMap.id, width, height, theme);
    }

    return NextResponse.json({
      map: newMap,
      generation: result,
    });
  } catch (error: any) {
    console.error("Error generating map:", error);
    
    // Handle duplicate mapId error
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Map with this ID already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
