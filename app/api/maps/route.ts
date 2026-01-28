import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { maps } from "@/src/db/schema";
import { desc, eq } from "drizzle-orm";

// GET: Get all maps or filter by mapId
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mapId = searchParams.get('mapId');

    // 如果提供了 mapId，返回特定地图
    if (mapId) {
      const [map] = await db
        .select()
        .from(maps)
        .where(eq(maps.mapId, mapId))
        .limit(1);

      if (!map) {
        return NextResponse.json(
          { error: 'Map not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        maps: [map],
        total: 1
      });
    }

    // 否则返回所有地图
    const allMaps = await db
      .select()
      .from(maps)
      .orderBy(desc(maps.createdAt));

    return NextResponse.json({
      maps: allMaps,
      total: allMaps.length
    });
  } catch (error) {
    console.error("Error fetching maps:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
