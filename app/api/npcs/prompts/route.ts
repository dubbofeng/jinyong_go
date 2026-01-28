import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { items } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 查询所有NPC类型的items
    const npcItems = await db
      .select()
      .from(items)
      .where(eq(items.itemType, 'npc'));

    // 转换为PromptTemplate格式
    const promptTemplates = npcItems
      .filter(item => item.prompt) // 只返回有prompt的NPCs
      .map(item => ({
        category: 'npc',
        id: item.itemId,
        name: item.name,
        nameEn: item.nameEn || item.name,
        prompt: item.prompt || '',
        negativePrompt: item.negativePrompt || '',
        width: item.imageWidth || 512,
        height: item.imageHeight || 512,
        style: 'isometric game character',
        imagePath: item.imagePath, // sprite路径: /game/isometric/characters/npc_xxx.png
        itemType: item.itemType,
      }));

    return NextResponse.json({
      success: true,
      items: promptTemplates,
      total: promptTemplates.length
    });
  } catch (error) {
    console.error('Failed to fetch NPCs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch NPCs' },
      { status: 500 }
    );
  }
}
