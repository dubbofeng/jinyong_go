import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { npcs } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET /api/npcs - 获取所有NPC
// GET /api/npcs?mapId=xxx - 获取指定地图的NPC
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mapId = searchParams.get('mapId');

    let query = db.select().from(npcs).orderBy(desc(npcs.createdAt));

    if (mapId) {
      query = db.select().from(npcs).where(eq(npcs.mapId, mapId)).orderBy(desc(npcs.createdAt)) as any;
    }

    const allNPCs = await query;

    return NextResponse.json({
      success: true,
      data: allNPCs,
      count: allNPCs.length,
    });
  } catch (error) {
    console.error('Error fetching NPCs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch NPCs' },
      { status: 500 }
    );
  }
}

// POST /api/npcs - 创建新NPC
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      npcId,
      name,
      description,
      mapId,
      positionX,
      positionY,
      dialogues,
      npcType,
      difficulty,
      teachableSkills,
    } = body;

    // 验证必填字段
    if (!npcId || !name || !mapId || positionX === undefined || positionY === undefined || !dialogues || !npcType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 插入新NPC
    const [newNPC] = await db
      .insert(npcs)
      .values({
        npcId,
        name,
        description: description || '',
        mapId,
        positionX,
        positionY,
        dialogues,
        npcType,
        difficulty: difficulty || null,
        teachableSkills: teachableSkills || [],
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newNPC,
    });
  } catch (error) {
    console.error('Error creating NPC:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create NPC' },
      { status: 500 }
    );
  }
}
