/**
 * NPC API 路由 - 演示数据加载器使用
 * GET /api/npcs/[npcId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadNPC, loadDialogue } from '@/src/lib/data-loader';

export async function GET(
  request: NextRequest,
  { params }: { params: { npcId: string } }
) {
  try {
    const { npcId } = params;
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'zh';

    // 1. 加载 NPC 基础数据（优先从数据库读取）
    const npc = await loadNPC(npcId);
    
    if (!npc) {
      return NextResponse.json(
        { error: 'NPC not found' },
        { status: 404 }
      );
    }

    // 2. 加载对应语言的对话数据（从 JSON 文件读取）
    const dialogue = loadDialogue(npcId, locale);

    // 3. 组合返回
    return NextResponse.json({
      ...npc,
      dialogue,
    });
  } catch (error) {
    console.error('Error loading NPC:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 使用示例：
 * 
 * // 前端调用
 * const response = await fetch('/api/npcs/hong_qigong?locale=zh');
 * const npc = await response.json();
 * 
 * // 返回数据结构：
 * {
 *   npcId: "hong_qigong",
 *   name: "洪七公",
 *   mapId: "huashan",
 *   positionX: 12,
 *   positionY: 9,
 *   npcType: "teacher",
 *   teachableSkills: ["kanglongyouhui"],
 *   dialogue: {
 *     "start": { ... },
 *     "first_meeting": { ... }
 *   }
 * }
 */
