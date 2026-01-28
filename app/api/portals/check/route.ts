/**
 * 传送门解锁状态检查API
 * GET /api/portals/check?mapId=xxx&portalId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { db } from '@/src/db';
import { mapItems } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkRequirements, loadPlayerContext } from '@/src/lib/requirement-checker';

/**
 * GET /api/portals/check?mapId=xxx&portalId=xxx
 * 检查传送门是否解锁
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const mapId = searchParams.get('mapId');
    const portalId = searchParams.get('portalId');

    if (!portalId) {
      return NextResponse.json(
        { error: '缺少portalId参数' },
        { status: 400 }
      );
    }

    // 查询传送门信息
    const portal = await db
      .select()
      .from(mapItems)
      .where(eq(mapItems.id, parseInt(portalId)))
      .limit(1);

    if (portal.length === 0) {
      return NextResponse.json(
        { error: '传送门不存在' },
        { status: 404 }
      );
    }

    const portalData = portal[0];

    // 如果传送门没有requirements，则默认解锁
    if (!portalData.requirements) {
      return NextResponse.json({
        success: true,
        data: {
          portalId: portalData.id,
          portalName: portalData.itemName,
          targetMapId: portalData.targetMapId,
          unlocked: true,
          reason: '无限制',
        },
      });
    }

    // 加载玩家上下文
    const playerContext = await loadPlayerContext(userId);

    // 检查requirements
    const requirements = portalData.requirements as any;
    const unlocked = await checkRequirements(requirements, playerContext);

    return NextResponse.json({
      success: true,
      data: {
        portalId: portalData.id,
        portalName: portalData.itemName,
        targetMapId: portalData.targetMapId,
        unlocked,
        reason: unlocked ? '已解锁' : '未满足解锁条件',
        requirements: requirements,
      },
    });

  } catch (error) {
    console.error('检查传送门状态失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
