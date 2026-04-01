import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 内存缓存：npcId_lang -> { data: any, timestamp: number }
const dialogueCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// GET /api/dialogues/[npcId]?lang=zh - 获取对话数据
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ npcId: string }> }
) {
  try {
    const { npcId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const lang = searchParams.get('lang') || 'zh';

    const cacheKey = `${npcId}_${lang}`;
    const now = Date.now();

    // 检查缓存
    const cached = dialogueCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(
        {
          success: true,
          data: cached.data,
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=300', // 浏览器缓存5分钟
          },
        }
      );
    }

    const dialoguesDir = path.join(process.cwd(), 'src/data/dialogues');
    const fileName = `${npcId}.${lang}.json`;
    const filePath = path.join(dialoguesDir, fileName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'Dialogue file not found' },
        { status: 404 }
      );
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 更新缓存
    dialogueCache.set(cacheKey, { data, timestamp: now });

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300', // 浏览器缓存5分钟
        },
      }
    );
  } catch (error) {
    console.error('Error loading dialogue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load dialogue' },
      { status: 500 }
    );
  }
}

// PUT /api/dialogues/[npcId]?lang=zh - 保存对话数据
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ npcId: string }> }
) {
  try {
    const { npcId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const lang = searchParams.get('lang') || 'zh';
    const body = await request.json();

    const dialoguesDir = path.join(process.cwd(), 'src/data/dialogues');

    // 确保目录存在
    if (!fs.existsSync(dialoguesDir)) {
      fs.mkdirSync(dialoguesDir, { recursive: true });
    }

    const fileName = `${npcId}.${lang}.json`;
    const filePath = path.join(dialoguesDir, fileName);

    // 保存文件
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Dialogue saved successfully',
    });
  } catch (error) {
    console.error('Error saving dialogue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save dialogue' },
      { status: 500 }
    );
  }
}
