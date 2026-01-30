import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const NPC_ID_PATTERN = /^[a-z0-9_]+$/i;
const LOCALES = new Set(['zh', 'en']);

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

  try {
    const filePath = join(process.cwd(), 'src', 'data', 'dialogues', `${npcId}.${locale}.json`);
    const content = await readFile(filePath, 'utf-8');
    return new NextResponse(content, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Dialogue not found' }, { status: 404 });
  }
}
