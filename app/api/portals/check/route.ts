/**
 * 传送门解锁状态检查API
 * GET /api/portals/check?mapId=xxx&portalId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { db } from '@/src/db';
import { mapItems, maps, items } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkRequirements, loadPlayerContext } from '@/src/lib/requirement-checker';

export const dynamic = 'force-dynamic';

/**
 * GET /api/portals/check?mapId=xxx&portalId=xxx
 * 检查传送门是否解锁
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const mapId = searchParams.get('mapId');
    const portalId = searchParams.get('portalId');

    if (!portalId) {
      return NextResponse.json({ error: '缺少portalId参数' }, { status: 400 });
    }

    // 查询传送门信息
    const portal = await db
      .select({
        id: mapItems.id,
        requirements: mapItems.requirements,
        sceneLinkMapId: mapItems.sceneLinkMapId,
        itemName: items.name,
      })
      .from(mapItems)
      .leftJoin(items, eq(mapItems.itemId, items.id))
      .where(eq(mapItems.id, parseInt(portalId)))
      .limit(1);

    if (portal.length === 0) {
      return NextResponse.json({ error: '传送门不存在' }, { status: 404 });
    }

    const portalData = portal[0];

    const targetMapId = portalData.sceneLinkMapId;
    const baseRequirements = Array.isArray(portalData.requirements) ? portalData.requirements : [];

    const combinedRequirements = [...baseRequirements];

    if (targetMapId) {
      const [targetMap] = await db
        .select({
          mapId: maps.mapId,
          mapType: maps.mapType,
          chapter: maps.chapter,
          minLevel: maps.minLevel,
        })
        .from(maps)
        .where(eq(maps.mapId, targetMapId))
        .limit(1);

      if (targetMap?.mapType === 'scene') {
        if (targetMap.chapter && targetMap.chapter > 0) {
          combinedRequirements.push({ type: 'chapter', chapter: targetMap.chapter });
        }
        if (targetMap.minLevel && targetMap.minLevel > 1) {
          combinedRequirements.push({ type: 'level', minLevel: targetMap.minLevel });
        }
      }
    }

    // 加载玩家上下文
    const playerContext = await loadPlayerContext(userId);

    // 检查requirements
    const unlockedResult = await checkRequirements(combinedRequirements, playerContext);

    return NextResponse.json({
      success: true,
      data: {
        portalId: portalData.id,
        portalName: portalData.itemName,
        targetMapId: targetMapId,
        unlocked: unlockedResult.satisfied,
        reason: unlockedResult.satisfied ? '已解锁' : unlockedResult.reason || '未满足解锁条件',
        requirements: combinedRequirements,
      },
    });
  } catch (error) {
    console.error('检查传送门状态失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
