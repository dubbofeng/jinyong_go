import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { sgfLessonsById } from '@/src/data/sgf-lessons';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing SGF id' }, { status: 400 });
  }

  const lesson = sgfLessonsById[id];
  if (!lesson) {
    return NextResponse.json({ success: false, error: 'Unknown SGF id' }, { status: 404 });
  }

  try {
    const filePath = path.join(process.cwd(), lesson.filePath);
    const sgf = await fs.readFile(filePath, 'utf8');

    return NextResponse.json({
      success: true,
      data: {
        id: lesson.id,
        title: lesson.title,
        npcId: lesson.npcId,
        sgf,
      },
    });
  } catch (error) {
    console.error('Failed to read SGF file:', error);
    return NextResponse.json({ success: false, error: 'Failed to read SGF file' }, { status: 500 });
  }
}
