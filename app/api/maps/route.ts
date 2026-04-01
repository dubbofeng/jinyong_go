import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { maps } from '@/src/db/schema';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// 地图列表缓存（地图列表不会经常变化）
let allMapsCache: { data: any[]; timestamp: number } | null = null;
const ALL_MAPS_CACHE_TTL = 10 * 60 * 1000; // 10分钟

// GET: Get all maps or filter by mapId
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mapId = searchParams.get('mapId');

    // 如果提供了 mapId，返回特定地图（不使用缓存，因为需要实时数据）
    if (mapId) {
      const [map] = await db.select().from(maps).where(eq(maps.mapId, mapId)).limit(1);

      if (!map) {
        return NextResponse.json({ error: 'Map not found' }, { status: 404 });
      }

      return NextResponse.json({
        maps: [map],
        total: 1,
      });
    }

    // 返回所有地图 - 使用缓存
    const now = Date.now();
    if (allMapsCache && now - allMapsCache.timestamp < ALL_MAPS_CACHE_TTL) {
      return NextResponse.json(
        {
          maps: allMapsCache.data,
          total: allMapsCache.data.length,
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=300', // 浏览器缓存5分钟
          },
        }
      );
    }

    const allMaps = await db.select().from(maps).orderBy(desc(maps.createdAt));

    // 更新缓存
    allMapsCache = { data: allMaps, timestamp: now };

    return NextResponse.json(
      {
        maps: allMaps,
        total: allMaps.length,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300', // 浏览器缓存5分钟
        },
      }
    );
  } catch (error) {
    console.error('Error fetching maps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
