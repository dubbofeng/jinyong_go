import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// GET /api/dialogues/[npcId]?lang=zh - 获取对话数据
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ npcId: string }> }
) {
  try {
    const { npcId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const lang = searchParams.get('lang') || 'zh';

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

    return NextResponse.json({
      success: true,
      data,
    });
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
