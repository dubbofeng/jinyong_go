import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { maps } from "@/src/db/schema";
import { desc } from "drizzle-orm";

// GET: Get all maps
export async function GET(req: NextRequest) {
  try {
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
