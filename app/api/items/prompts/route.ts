import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { items } from '@/src/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const itemTypes = searchParams.get('types')?.split(',') || ['consumable', 'material', 'building', 'decoration'];

    // 查询items
    const itemsList = await db
      .select()
      .from(items)
      .where(inArray(items.itemType, itemTypes));

    // 转换为PromptTemplate格式
    const promptTemplates = itemsList
      .filter(item => item.prompt) // 只返回有prompt的items
      .map(item => ({
        category: item.itemType === 'building' || item.itemType === 'decoration' ? 'building' : 'item',
        id: item.itemId,
        name: item.name,
        nameEn: item.nameEn || item.name,
        prompt: item.prompt || '',
        negativePrompt: item.negativePrompt || '',
        width: item.imageWidth || 512,
        height: item.imageHeight || 512,
        style: item.itemType === 'building' ? 'isometric game asset' : 'game icon',
        imagePath: item.imagePath, // 原始图片路径
        itemType: item.itemType, // 原始类型，用于分类
      }));

    return NextResponse.json({
      success: true,
      items: promptTemplates,
      total: promptTemplates.length
    });
  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}
