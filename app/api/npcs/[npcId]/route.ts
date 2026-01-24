import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { npcs } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/npcs/[npcId] - 获取单个NPC
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ npcId: string }> }
) {
  try {
    const { npcId } = await params;

    // 检查是否为数字ID或字符串npcId
    const isNumericId = /^\d+$/.test(npcId);
    
    const [npc] = isNumericId
      ? await db.select().from(npcs).where(eq(npcs.id, parseInt(npcId)))
      : await db.select().from(npcs).where(eq(npcs.npcId, npcId));

    if (!npc) {
      return NextResponse.json(
        { success: false, error: 'NPC not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: npc,
    });
  } catch (error) {
    console.error('Error fetching NPC:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch NPC' },
      { status: 500 }
    );
  }
}

// PUT /api/npcs/[npcId] - 更新NPC
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ npcId: string }> }
) {
  try {
    const { npcId } = await params;
    const body = await request.json();

    // 检查是否为数字ID或字符串npcId
    const isNumericId = /^\d+$/.test(npcId);
    
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.mapId !== undefined) updateData.mapId = body.mapId;
    if (body.positionX !== undefined) updateData.positionX = body.positionX;
    if (body.positionY !== undefined) updateData.positionY = body.positionY;
    if (body.dialogues !== undefined) updateData.dialogues = body.dialogues;
    if (body.npcType !== undefined) updateData.npcType = body.npcType;
    if (body.difficulty !== undefined) updateData.difficulty = body.difficulty;
    if (body.teachableSkills !== undefined) updateData.teachableSkills = body.teachableSkills;

    updateData.updatedAt = new Date();

    const [updatedNPC] = isNumericId
      ? await db.update(npcs).set(updateData).where(eq(npcs.id, parseInt(npcId))).returning()
      : await db.update(npcs).set(updateData).where(eq(npcs.npcId, npcId)).returning();

    if (!updatedNPC) {
      return NextResponse.json(
        { success: false, error: 'NPC not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedNPC,
    });
  } catch (error) {
    console.error('Error updating NPC:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update NPC' },
      { status: 500 }
    );
  }
}

// DELETE /api/npcs/[npcId] - 删除NPC
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ npcId: string }> }
) {
  try {
    const { npcId } = await params;

    // 检查是否为数字ID或字符串npcId
    const isNumericId = /^\d+$/.test(npcId);
    
    const [deletedNPC] = isNumericId
      ? await db.delete(npcs).where(eq(npcs.id, parseInt(npcId))).returning()
      : await db.delete(npcs).where(eq(npcs.npcId, npcId)).returning();

    if (!deletedNPC) {
      return NextResponse.json(
        { success: false, error: 'NPC not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deletedNPC,
    });
  } catch (error) {
    console.error('Error deleting NPC:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete NPC' },
      { status: 500 }
    );
  }
}
