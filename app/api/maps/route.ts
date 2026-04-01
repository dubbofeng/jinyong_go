import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { maps } from '@/src/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// 地图列表缓存（地图列表不会经常变化）
let allMapsCache: { data: any[]; timestamp: number } | null = null;
const ALL_MAPS_CACHE_TTL = 10 * 60 * 1000; // 10分钟

// 批量查询缓存：mapIds组合 -> { data: any[], timestamp: number }
const batchCache = new Map<string, { data: any[]; timestamp: number }>();
const BATCH_CACHE_TTL = 5 * 60 * 1000; // 5分钟

// GET: Get all maps, filter by mapId, or batch query by mapIds
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mapId = searchParams.get('mapId');
    const mapIds = searchParams.get('mapIds'); // 支持批量查询: ?mapIds=map1,map2,map3

    // 批量查询多个地图（一次API调用）
    if (mapIds) {
      const idList = mapIds.split(',').filter(Boolean);
      if (idList.length === 0) {
        return NextResponse.json({ error: 'Empty mapIds' }, { status: 400 });
      }

      const cacheKey = idList.sort().join(',');
      const now = Date.now();

      // 检查批量缓存
      const cached = batchCache.get(cacheKey);
      if (cached && now - cached.timestamp < BATCH_CACHE_TTL) {
        return NextResponse.json(
          {
            maps: cached.data,
            total: cached.data.length,
          },
          {
            headers: {
              'Cache-Control': 'public, max-age=300', // 浏览器缓存5分钟
            },
          }
        );
      }

      // 批量查询数据库
      const results = await db
        .select()
        .from(maps)
        .where(inArray(maps.mapId, idList));

      // 更新缓存
      batchCache.set(cacheKey, { data: results, timestamp: now });

      return NextResponse.json(
        {
          maps: results,
          total: results.length,
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=300', // 浏览器缓存5分钟
          },
        }
      );
    }

    // 如果提供了单个 mapId，返回特定地图
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
