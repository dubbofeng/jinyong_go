import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { mapItems, maps } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

// GET: Retrieve all items for a specific map
export async function GET(
  req: NextRequest,
  context: { params: { mapId: string } }
) {
  const { params } = context;
  const mapId = params.mapId;

  if (!mapId) {
    return NextResponse.json({ error: "Invalid map ID" }, { status: 400 });
  }

  try {
    // Get map info
    const [map] = await db
      .select()
      .from(maps)
      .where(eq(maps.mapId, mapId));

    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    // Get all items for the map
    const items = await db
      .select()
      .from(mapItems)
      .where(eq(mapItems.mapId, map.id));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Add a new item to the map
export async function POST(
  req: NextRequest,
  context: { params: { mapId: string } }
) {
  const { params } = context;
  const mapId = params.mapId;

  if (!mapId) {
    return NextResponse.json({ error: "Invalid map ID" }, { status: 400 });
  }

  try {
    // Get map info
    const [map] = await db
      .select()
      .from(maps)
      .where(eq(maps.mapId, mapId));

    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    // Parse the request body
    const body = await req.json();
    const {
      itemName,
      itemPath,
      itemType,
      x,
      y,
      width,
      height,
      animated,
      targetMapId,
      targetX,
      targetY,
    } = body;

    // Validate required fields
    if (
      !itemName ||
      !itemPath ||
      !itemType ||
      x === undefined ||
      y === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert the new item
    const [newItem] = await db
      .insert(mapItems)
      .values({
        mapId: map.id,
        itemName,
        itemPath,
        itemType,
        x,
        y,
        width,
        height,
        animated,
        targetMapId,
        targetX,
        targetY,
      })
      .returning();

    return NextResponse.json({ item: newItem }, { status: 201 });
  } catch (error) {
    console.error("Error adding item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove an item from the map
export async function DELETE(
  req: NextRequest,
  context: { params: { mapId: string } }
) {
  const { params } = context;
  const mapId = params.mapId;
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");

  if (!mapId || !itemId) {
    return NextResponse.json(
      { error: "Invalid map ID or item ID" },
      { status: 400 }
    );
  }

  try {
    // Get map info
    const [map] = await db
      .select()
      .from(maps)
      .where(eq(maps.mapId, mapId));

    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    // Delete the item
    await db
      .delete(mapItems)
      .where(
        and(eq(mapItems.mapId, map.id), eq(mapItems.id, parseInt(itemId)))
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
