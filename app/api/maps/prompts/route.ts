import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { maps } from '@/src/db/schema';
import { isNotNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 查询所有有AI提示词的地图
    const mapsList = await db
      .select()
      .from(maps)
      .where(isNotNull(maps.imagePromptZh));

    // 转换为PromptTemplate格式
    const promptTemplates = mapsList.map(map => ({
      category: 'map' as const,
      id: map.mapId,
      name: map.name,
      nameEn: map.mapId,
      prompt: map.imagePromptZh || '',
      promptEn: map.imagePromptEn || '',
      negativePrompt: '',
      width: 512,
      height: 512,
      style: 'isometric scene',
      imagePath: map.isometricImage, // 等距图路径
      chapter: map.chapter,
      minLevel: map.minLevel,
      worldX: map.worldX,
      worldY: map.worldY,
      description: map.description,
    }));

    return NextResponse.json({
      success: true,
      maps: promptTemplates,
      total: promptTemplates.length
    });
  } catch (error) {
    console.error('Failed to fetch maps:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maps' },
      { status: 500 }
    );
  }
}
