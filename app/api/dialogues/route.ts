import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const NPC_ID_PATTERN = /^[a-z0-9_]+$/i;
const LOCALES = new Set(['zh', 'en']);

// 内存缓存：npcId_locale -> { content: string, timestamp: number }
const dialogueCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const npcId = searchParams.get('npcId') || '';
  const locale = searchParams.get('locale') || 'zh';

  if (!NPC_ID_PATTERN.test(npcId)) {
    return NextResponse.json({ success: false, error: 'Invalid npcId' }, { status: 400 });
  }

  if (!LOCALES.has(locale)) {
    return NextResponse.json({ success: false, error: 'Invalid locale' }, { status: 400 });
  }

  const cacheKey = `${npcId}_${locale}`;
  const now = Date.now();

  // 检查缓存
  const cached = dialogueCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 浏览器缓存5分钟
      },
    });
  }

  try {
    const filePath = join(process.cwd(), 'src', 'data', 'dialogues', `${npcId}.${locale}.json`);
    const content = await readFile(filePath, 'utf-8');

    // 更新缓存
    dialogueCache.set(cacheKey, { content, timestamp: now });

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 浏览器缓存5分钟
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Dialogue not found' }, { status: 404 });
  }
}
